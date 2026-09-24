import { expect } from 'chai';
import { ethers, network } from 'hardhat';

// Runs on a fork of X Layer mainnet against the issuer's real xStocks and ERC-4626 wrappers.
const NVDAx = '0xc845b2894dbddd03858fd2d643b4ef725fe0849d';
const wNVDAx = '0xa8ddb5cd96b5222afe198316e9a57caa642850d5';
const NFLXx = '0xa6a65ac27e76cd53cb790473e4345c46e5ebf961';
const wNFLXx = '0x7d87fd6a379714194a797c0bbb8b40c30d250856';
const TSLAx_WRAPPER = '0xc3fdbe3a68ee5de461d30415a8165cf9aefe1171';
const DAY = 24 * 60 * 60;
const ERC20 = ['function balanceOf(address) view returns (uint256)', 'function approve(address,uint256) returns (bool)', 'function transfer(address,uint256) returns (bool)', 'function deposit(uint256,address) returns (uint256)'];

async function fund(token: string, from: string, to: string, amount: bigint) {
  await network.provider.request({ method: 'hardhat_impersonateAccount', params: [from] });
  await network.provider.request({ method: 'hardhat_setBalance', params: [from, '0xde0b6b3a7640000'] });
  const signer = await ethers.getSigner(from);
  await (await ethers.getContractAt(ERC20, token, signer)).transfer(to, amount);
  await network.provider.request({ method: 'hardhat_stopImpersonatingAccount', params: [from] });
}

describe('DaybreakConvictionVault (X Layer mainnet fork)', () => {
  async function setup() {
    const [creator, alice, bob] = await ethers.getSigners();
    const vault = await (await ethers.getContractFactory('DaybreakConvictionVault')).deploy([wNVDAx, wNFLXx, TSLAx_WRAPPER]);
    // Each wrapper holds its xStock, so it is a real holder to fund test accounts from.
    for (const who of [alice, bob]) {
      await fund(NVDAx, wNVDAx, who.address, ethers.parseEther('10'));
    }
    const nvda = await ethers.getContractAt(ERC20, NVDAx);
    const wnvda = await ethers.getContractAt(ERC20, wNVDAx);
    return { vault, creator, alice, bob, nvda, wnvda };
  }

  it('lists wrappers with their on-chain xStock', async () => {
    const { vault } = await setup();
    expect((await vault.stockOf(wNVDAx)).toLowerCase()).to.equal(NVDAx);
    expect((await vault.stockOf(wNFLXx)).toLowerCase()).to.equal(NFLXx);
    expect(await vault.supportedWrappers()).to.have.length(3);
    const Vault = await ethers.getContractFactory('DaybreakConvictionVault');
    await expect(Vault.deploy([wNVDAx, wNVDAx])).to.be.revertedWithCustomError(Vault, 'UnsupportedStock');
  });

  it('validates new theses', async () => {
    const { vault } = await setup();
    await expect(vault.openThesis(NVDAx, true, DAY, 'x')).to.be.revertedWithCustomError(vault, 'UnsupportedStock');
    await expect(vault.openThesis(wNVDAx, true, 60, 'x')).to.be.revertedWithCustomError(vault, 'BadDuration');
    await expect(vault.openThesis(wNVDAx, true, 400 * DAY, 'x')).to.be.revertedWithCustomError(vault, 'BadDuration');
    await expect(vault.openThesis(wNVDAx, true, DAY, '')).to.be.revertedWithCustomError(vault, 'BadUri');
    await expect(vault.openThesis(wNVDAx, true, DAY, 'a'.repeat(257))).to.be.revertedWithCustomError(vault, 'BadUri');
    await expect(vault.openThesis(wNVDAx, true, 7 * DAY, 'https://www.daybreakcircles.lol/thesis/nvda')).to.emit(vault, 'ThesisOpened');
    const t = await vault.getThesis(0);
    expect(t.bullish).to.equal(true);
    expect(await vault.thesisCount()).to.equal(1n);
  });

  it('locks real NVDAx as wrapper shares and returns it after expiry', async () => {
    const { vault, alice, bob, nvda, wnvda } = await setup();
    await vault.openThesis(wNVDAx, true, 7 * DAY, 'https://www.daybreakcircles.lol/thesis/nvda');
    const amount = ethers.parseEther('2.5');
    const start = await nvda.balanceOf(alice.address);
    await nvda.connect(alice).approve(await vault.getAddress(), amount);
    await expect(vault.connect(alice).back(0, amount)).to.emit(vault, 'Backed');
    const shares = await vault.sharesOf(0, alice.address);
    expect(shares).to.be.gt(0n);
    expect(await wnvda.balanceOf(await vault.getAddress())).to.equal(shares);
    expect(await nvda.balanceOf(alice.address)).to.equal(start - amount);
    expect(await vault.lockedStock(0)).to.be.closeTo(amount, 2n);

    // Bob backs with already-wrapped stock.
    await nvda.connect(bob).approve(wNVDAx, ethers.parseEther('1'));
    await (await ethers.getContractAt(ERC20, wNVDAx, bob)).deposit(ethers.parseEther('1'), bob.address);
    const bobShares = await wnvda.balanceOf(bob.address);
    await wnvda.connect(bob).approve(await vault.getAddress(), bobShares);
    await vault.connect(bob).backWrapped(0, bobShares);
    expect((await vault.getThesis(0)).backers).to.equal(2);

    await expect(vault.connect(alice).withdraw(0, true)).to.be.revertedWithCustomError(vault, 'StillLocked');
    await network.provider.send('evm_increaseTime', [7 * DAY]);
    await network.provider.send('evm_mine');
    await expect(vault.connect(alice).back(0, 1n)).to.be.revertedWithCustomError(vault, 'ThesisExpired');

    await vault.connect(alice).withdraw(0, true);
    expect(await nvda.balanceOf(alice.address)).to.be.closeTo(start, 2n);
    await expect(vault.connect(alice).withdraw(0, true)).to.be.revertedWithCustomError(vault, 'NothingToWithdraw');

    await vault.connect(bob).withdraw(0, false);
    expect(await wnvda.balanceOf(bob.address)).to.equal(bobShares);
    expect((await vault.getThesis(0)).totalShares).to.equal(0n);
    expect(await wnvda.balanceOf(await vault.getAddress())).to.equal(0n);
  });

  it('backs in one transaction with a real NVDAx permit, and survives a replayed permit', async () => {
    const { vault, alice, nvda } = await setup();
    await vault.openThesis(wNVDAx, true, DAY, 'permit flow');
    const amount = ethers.parseEther('1');
    const vaultAddress = await vault.getAddress();
    const token = await ethers.getContractAt(['function nonces(address) view returns (uint256)', 'function name() view returns (string)', 'function allowance(address,address) view returns (uint256)'], NVDAx);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600) + 10n * BigInt(DAY);
    const sig = ethers.Signature.from(await alice.signTypedData(
      { name: await token.name(), version: '1', chainId: 196, verifyingContract: NVDAx },
      { Permit: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] },
      { owner: alice.address, spender: vaultAddress, value: amount, nonce: await token.nonces(alice.address), deadline },
    ));
    const before = await nvda.balanceOf(alice.address);
    // A front-runner submits the permit first; backing must still succeed.
    await (await ethers.getContractAt(['function permit(address,address,uint256,uint256,uint8,bytes32,bytes32)'], NVDAx)).permit(alice.address, vaultAddress, amount, deadline, sig.v, sig.r, sig.s);
    await vault.connect(alice).backWithPermit(0, amount, deadline, sig.v, sig.r, sig.s);
    expect(await nvda.balanceOf(alice.address)).to.equal(before - amount);
    expect(await vault.lockedStock(0)).to.be.closeTo(amount, 2n);
    // Clean single-transaction path with a fresh permit.
    const sig2 = ethers.Signature.from(await alice.signTypedData(
      { name: await token.name(), version: '1', chainId: 196, verifyingContract: NVDAx },
      { Permit: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] },
      { owner: alice.address, spender: vaultAddress, value: amount, nonce: await token.nonces(alice.address), deadline },
    ));
    await vault.connect(alice).backWithPermit(0, amount, deadline, sig2.v, sig2.r, sig2.s);
    expect(await vault.lockedStock(0)).to.be.closeTo(amount * 2n, 4n);
    expect((await vault.getThesis(0)).backers).to.equal(1);
    expect(await token.allowance(alice.address, vaultAddress)).to.equal(0n);
  });

  it('rejects zero amounts, unknown theses and missing approvals', async () => {
    const { vault, alice } = await setup();
    await vault.openThesis(wNVDAx, false, DAY, 'bear case');
    await expect(vault.connect(alice).back(0, 0)).to.be.revertedWithCustomError(vault, 'ZeroAmount');
    await expect(vault.connect(alice).back(5, 1)).to.be.revertedWithCustomError(vault, 'UnknownThesis');
    await expect(vault.connect(alice).back(0, ethers.parseEther('1'))).to.be.reverted;
  });
});
