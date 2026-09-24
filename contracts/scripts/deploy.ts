import fs from 'node:fs';
import path from 'node:path';
import { ethers, network } from 'hardhat';

// Deploys DaybreakConvictionVault with every verified xStocks wrapper in lib/xlayer/tokens.ts.
// Mainnet: XLAYER_DEPLOYER_KEY=... npm run deploy:xlayer
async function main() {
  const registry = fs.readFileSync(path.join(__dirname, '../../lib/xlayer/tokens.ts'), 'utf8');
  const wrappers = [...registry.matchAll(/wrapper: '(0x[0-9a-f]{40})'/g)].map((m) => ethers.getAddress(m[1]));
  if (wrappers.length !== 20) throw new Error(`Expected 20 wrappers, parsed ${wrappers.length}`);
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error('No deployer account: set XLAYER_DEPLOYER_KEY');
  const { chainId } = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`network=${network.name} chainId=${chainId} deployer=${deployer.address} balance=${ethers.formatEther(balance)} OKB`);

  const Vault = await ethers.getContractFactory('DaybreakConvictionVault');
  const tx = await Vault.getDeployTransaction(wrappers);
  const gas = await ethers.provider.estimateGas({ ...tx, from: deployer.address });
  const fee = await ethers.provider.getFeeData();
  const cost = gas * (fee.maxFeePerGas ?? fee.gasPrice ?? 0n);
  console.log(`estimated gas=${gas} max cost=${ethers.formatEther(cost)} OKB`);
  if (balance < cost) throw new Error('Deployer balance is below the estimated deploy cost');

  const vault = await Vault.deploy(wrappers);
  const receipt = await vault.deploymentTransaction()!.wait();
  const address = await vault.getAddress();
  console.log(`DaybreakConvictionVault deployed at ${address} in block ${receipt!.blockNumber} (tx ${receipt!.hash})`);

  if (network.name === 'xlayer') {
    const record = { chainId: Number(chainId), address, deployer: deployer.address, txHash: receipt!.hash, blockNumber: receipt!.blockNumber, deployedAt: new Date().toISOString(), wrappers, explorer: `https://www.oklink.com/xlayer/address/${address}` };
    fs.writeFileSync(path.join(__dirname, '../deployments/xlayer.json'), JSON.stringify(record, null, 2) + '\n');
    console.log('Wrote contracts/deployments/xlayer.json');
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
