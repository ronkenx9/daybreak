#!/usr/bin/env node
// Checklist item zero as a runnable gate:
//   node scripts/verify-safe.mjs <0xSafeAddress> [rpcUrl] [--chain 8453]
// Exits 0 only when the Safe is deployed AND initialized on the target chain.
import { createPublicClient, http } from 'viem';

const address = process.argv[2];
const args = process.argv.slice(3);
const rpcIdx = args.indexOf('--rpc');
const chainIdx = args.indexOf('--chain');
const rpcUrl = rpcIdx >= 0 ? args[rpcIdx + 1] : process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const chainId = Number(chainIdx >= 0 ? args[chainIdx + 1] : 8453);
if (!/^0x[a-fA-F0-9]{40}$/.test(address || '')) {
  console.error('Usage: node scripts/verify-safe.mjs <0xSafeAddress> [--rpc URL] [--chain ID]');
  process.exit(2);
}
const SAFE_ABI = [
  { name: 'getThreshold', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getOwners', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
];
try {
  const client = createPublicClient({ transport: http(rpcUrl) });
  const code = await client.getBytecode({ address });
  if (!code || code === '0x') {
    console.error(`FAIL ${address}: no contract code on chain ${chainId} (counterfactual or wrong chain)`);
    process.exit(1);
  }
  let threshold, owners;
  try {
    [threshold, owners] = await Promise.all([
      client.readContract({ address, abi: SAFE_ABI, functionName: 'getThreshold' }),
      client.readContract({ address, abi: SAFE_ABI, functionName: 'getOwners' }),
    ]);
  } catch {
    console.error(`FAIL ${address}: code exists but is not an initialized Safe (getThreshold/getOwners reverted)`);
    process.exit(1);
  }
  if (threshold === 0n || owners.length === 0) {
    console.error(`FAIL ${address}: Safe not initialized (threshold=${threshold}, owners=${owners.length})`);
    process.exit(1);
  }
  console.log(`PASS ${address}: Safe deployed, threshold=${threshold}, owners=${owners.length} (chain ${chainId})`);
} catch (e) {
  console.error(`FAIL: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
