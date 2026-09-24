import { ethers, network } from 'hardhat';

// Local X Layer fork only: seeds demo theses and a permit-backed position. Refuses real networks.
const VAULT = process.env.VAULT!;
const NVDAx = '0xc845b2894dbddd03858fd2d643b4ef725fe0849d', wNVDAx = '0xa8ddb5cd96b5222afe198316e9a57caa642850d5', wTSLAx = '0xc3fdbe3a68ee5de461d30415a8165cf9aefe1171';

async function main() {
  if (network.name !== 'localhost') throw new Error('seed-fork only runs against a local fork');
  const [, alice] = await ethers.getSigners();
  const vault = await ethers.getContractAt('DaybreakConvictionVault', VAULT, alice);
  await (await vault.openThesis(wNVDAx, true, 30 * 86400, 'Data-center demand keeps NVIDIA ahead of estimates through Q1.')).wait();
  await (await vault.openThesis(wTSLAx, false, 7 * 86400, 'Delivery numbers disappoint; TSLA gives back its September run.')).wait();
  await network.provider.request({ method: 'hardhat_impersonateAccount', params: [wNVDAx] });
  await network.provider.request({ method: 'hardhat_setBalance', params: [wNVDAx, '0xde0b6b3a7640000'] });
  const holder = await ethers.getSigner(wNVDAx);
  await (await (await ethers.getContractAt(['function transfer(address,uint256) returns (bool)'], NVDAx, holder)).transfer(alice.address, ethers.parseEther('5'))).wait();
  const token = await ethers.getContractAt(['function nonces(address) view returns (uint256)', 'function name() view returns (string)'], NVDAx);
  const amount = ethers.parseEther('1.5'), deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const sig = ethers.Signature.from(await alice.signTypedData(
    { name: await token.name(), version: '1', chainId: 196, verifyingContract: NVDAx },
    { Permit: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] },
    { owner: alice.address, spender: VAULT, value: amount, nonce: await token.nonces(alice.address), deadline }));
  await (await vault.backWithPermit(0, amount, deadline, sig.v, sig.r, sig.s)).wait();
  console.log(`seeded 2 theses; ${alice.address} backed thesis 0 with 1.5 NVDAx (permit) and holds 3.5 NVDAx`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
