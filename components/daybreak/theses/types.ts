export interface ThesisInstrumentView {
  id: string; companyId: string; companyName: string; ticker: string; symbol: string;
  namespace: 'solana:mainnet'; mint: string; decimals: number; issuer: 'xstocks';
  status: 'creation_verified' | 'verification_pending' | 'unsupported';
  creationVerifiedAt: string | null;
  lifecycle: { create: boolean; buy: boolean; sell: boolean; graduate: boolean };
}

export interface ThesisView {
  id: string; slug: string; instrumentId: string; companyId: string;
  title: string; summary: string; body: string; invalidation: string; horizon: string | null;
  sources: string[]; tokenName: string; tokenSymbol: string; status: string;
  publishedAt: string | null; authorName: string | null; authorAvatar: number | null;
  authorAvatarUrl: string | null; marketId: string; marketStatus: string; poolAddress: string;
  baseMint: string; quoteMint: string; quoteDecimals: number; configVersion: string;
  txSignature: string | null; terms: Record<string, unknown>;
}

export interface ThesisLaunchPreview {
  transactionBase64: string; thesisId: string; slug: string; idempotencyKey: string;
  poolAddress: string; configAddress: string; baseMint: string; quoteMint: string;
  tokenBadge: string; requiresSigner: string; lastValidBlockHeight: number;
  instrument: Pick<ThesisInstrumentView, 'id' | 'companyId' | 'companyName' | 'ticker' | 'symbol' | 'mint' | 'decimals'>;
  terms: { version: string; quoteDecimals: number; initialMarketCapQuote: number; migrationMarketCapQuote: number; supplyMode: 'dynamic'; startingFeeBps: number; endingFeeBps: number; creatorTradingFeePercentage: number; migratedLiquidityPermanentLockedPct: number };
}

export interface ThesisTradeReview {
  quoteId: string; transactionBase64: string; requiresSigner: string; direction: 'buy' | 'sell';
  phase: 'bonding_curve'; poolAddress: string; slippageBps: number; feeAmountRaw: string | null;
  expiresAt: string;
  input: { mint: string; symbol: string; decimals: number; amountRaw: string; amount: string };
  expectedOutput: { mint: string; symbol: string; decimals: number; amountRaw: string; amount: string };
  minimumOutput: { amountRaw: string; amount: string };
}
