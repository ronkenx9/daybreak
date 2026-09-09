// Typed shapes mirrored from Bankr documentation. The stock-paired deployment
// shape was verified against a live simulation on 2026-09-09.

export interface SwapQuoteRequest {
  fromChain: string; fromToken: string; toChain: string; toToken: string;
  amount: string; // human-readable
  slippageBps?: number; // 10–2000, default 500
}
export interface SwapSide {
  chain: string; token: string; amount: string; formattedAmount: string;
  symbol: string; decimals: number; usdValue: number | null;
}
export interface SwapQuote {
  from: SwapSide; to: SwapSide; minBuyAmount: string;
  feeBps: number; feeWaivedForEcosystemToken: boolean; slippageBps: number;
  priceImpactBps: number | null; networkCostsUsd: number | null;
  sellTokenPriceUsd: number | null; buyTokenPriceUsd: number | null; quoteId: string;
}
export interface SwapExecuteRequest extends SwapQuoteRequest {
  minBuyAmount: string; quoteId?: string; idempotencyKey?: string;
}
export interface SwapResult {
  success: boolean; // false = mined and reverted; never treat 200 as success alone
  hash: string; amountSold: number; amountReceived: number;
  amountSoldRaw: string; amountReceivedRaw: string;
}

export type FeeRecipient = { type: 'wallet' | 'x' | 'farcaster' | 'ens'; value: string };
export interface DeployRequest {
  chain: 'base'; tokenName: string; tokenSymbol: string;
  description?: string; image?: string; tweetUrl?: string; websiteUrl?: string;
  feeRecipient?: FeeRecipient; // required in partner mode
  pairedTokenAddress?: string; // Base user-key only; mutually exclusive with pairedStockAddress
  pairedStockAddress?: string;
  quoteOnlyFees?: boolean; degenMode?: boolean; disableVesting?: boolean; simulateOnly?: boolean;
}
export interface DeployResult {
  success: boolean; simulated?: boolean; txHash?: string; tokenAddress: string;
  poolId: string; chain?: string; chainId?: number; status?: string;
  feeDistribution: Record<string, { address: string; bps: number }>;
}
