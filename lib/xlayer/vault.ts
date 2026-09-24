// DaybreakConvictionVault on X Layer (contracts/src/DaybreakConvictionVault.sol).
// Client-safe: address and ABI only. Defaults to the mainnet deployment recorded in
// contracts/deployments/xlayer.json (block 71490884); NEXT_PUBLIC_XLAYER_VAULT_ADDRESS overrides
// it, e.g. to point a local fork at a test deployment.
export const XLAYER_VAULT_MAINNET = '0x55318f36f5b482e9f2b1429f2ca7fd7c5bbf97fc';
export const XLAYER_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_XLAYER_VAULT_ADDRESS || XLAYER_VAULT_MAINNET).toLowerCase() as `0x${string}` | '';
export const XLAYER_VAULT_MAX_STATEMENT_BYTES = 256;
export const XLAYER_VAULT_DURATIONS = [{ label: '7 days', seconds: 7 * 86400 }, { label: '30 days', seconds: 30 * 86400 }, { label: '90 days', seconds: 90 * 86400 }] as const;

export const vaultAbi = [
  { type: 'function', name: 'thesisCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getThesis', stateMutability: 'view', inputs: [{ name: 'thesisId', type: 'uint256' }], outputs: [{ type: 'tuple', components: [
    { name: 'creator', type: 'address' }, { name: 'wrapper', type: 'address' }, { name: 'createdAt', type: 'uint64' }, { name: 'expiresAt', type: 'uint64' },
    { name: 'bullish', type: 'bool' }, { name: 'totalShares', type: 'uint256' }, { name: 'backers', type: 'uint32' }, { name: 'uri', type: 'string' },
  ] }] },
  { type: 'function', name: 'lockedStock', stateMutability: 'view', inputs: [{ name: 'thesisId', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'sharesOf', stateMutability: 'view', inputs: [{ name: 'thesisId', type: 'uint256' }, { name: 'backer', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'openThesis', stateMutability: 'nonpayable', inputs: [{ name: 'wrapper', type: 'address' }, { name: 'bullish', type: 'bool' }, { name: 'duration', type: 'uint64' }, { name: 'uri', type: 'string' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'back', stateMutability: 'nonpayable', inputs: [{ name: 'thesisId', type: 'uint256' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'backWithPermit', stateMutability: 'nonpayable', inputs: [{ name: 'thesisId', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'v', type: 'uint8' }, { name: 'r', type: 'bytes32' }, { name: 's', type: 'bytes32' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'withdraw', stateMutability: 'nonpayable', inputs: [{ name: 'thesisId', type: 'uint256' }, { name: 'unwrap', type: 'bool' }], outputs: [{ type: 'uint256' }] },
] as const;

export const erc20ApproveAbi = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

export interface VaultThesis {
  id: number; creator: string; wrapper: string; ticker: string | null; symbol: string | null;
  bullish: boolean; statement: string; createdAt: number; expiresAt: number; expired: boolean;
  backers: number; lockedStock: string; yourShares: string | null; yourStock: string | null;
}
