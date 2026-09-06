import 'server-only';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Base mainnet read client. Override the RPC with BASE_RPC_URL — the default
// public node is fine for low volume but rate-limits under load. Base's
// Multicall3 lets us read every feed/holding in a single request.
export const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

export const baseClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL, { timeout: 12000, retryCount: 1 }),
});
