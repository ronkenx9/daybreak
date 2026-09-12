import type { Address, PublicClient } from 'viem';

// Checklist item zero: never pass a counterfactual Safe address into immutable
// calldata. A Safe that isn't deployed (or is initialized with different
// parameters later) locks fee claims permanently. Verify on-chain first.
const SAFE_ABI = [
  { name: 'getThreshold', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'getOwners', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] },
] as const;

export interface SafeCheck { address: Address; deployed: boolean; initialized: boolean; threshold?: bigint; owners?: Address[] }

export async function verifySafe(client: PublicClient, address: Address): Promise<SafeCheck> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('Bad address');
  const code = await client.getBytecode({ address });
  if (!code || code === '0x') return { address, deployed: false, initialized: false };
  try {
    const [threshold, owners] = await Promise.all([
      client.readContract({ address, abi: SAFE_ABI, functionName: 'getThreshold' }),
      client.readContract({ address, abi: SAFE_ABI, functionName: 'getOwners' }),
    ]);
    const okOwners = (owners as Address[]).every((o) => /^0x[a-fA-F0-9]{40}$/.test(o));
    return { address, deployed: true, initialized: (threshold as bigint) > 0n && (owners as Address[]).length > 0 && okOwners, threshold: threshold as bigint, owners: owners as Address[] };
  } catch {
    return { address, deployed: true, initialized: false };
  }
}
