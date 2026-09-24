import 'server-only';
import { createPublicClient, http } from 'viem';
import { xLayer } from 'viem/chains';

// X Layer mainnet read client. Override with XLAYER_RPC_URL under load.
// viem's chain definition carries Multicall3, so each snapshot is one request.
export const XLAYER_RPC_URL = process.env.XLAYER_RPC_URL || 'https://rpc.xlayer.tech';

export const xlayerClient = createPublicClient({
  chain: xLayer,
  transport: http(XLAYER_RPC_URL, { timeout: 12000, retryCount: 1 }),
});
