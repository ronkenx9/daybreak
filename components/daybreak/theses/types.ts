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
  sources: string[]; tokenName: string; tokenSymbol: string; mode: 'paper' | 'live'; status: string;
  publishedAt: string | null; authorName: string | null; authorAvatar: number | null;
  authorAvatarUrl: string | null; marketId: string | null; marketStatus: string | null; poolAddress: string | null;
  baseMint: string | null; quoteMint: string | null; quoteDecimals: number | null; configVersion: string | null;
  txSignature: string | null; terms: Record<string, unknown> | null;
  paperBaseReserve: number | null; paperQuoteReserve: number | null; paperTradeCount: number | null;
}

export interface PaperParticipantView {
  publicId: string;
  displayName: string | null; avatar: number | null; avatarUrl: string | null;
  isViewer: boolean; updatedAt: string;
}

export interface PaperPositionView extends PaperParticipantView {
  estimatedExitValue: number; estimatedExitPnl: number;
  quantity: number; costBasisQuote: number; realizedPnlQuote: number;
  stockBalance: number | null;
  marketValueQuote: number; unrealizedPnlQuote: number; totalPnlQuote: number; averageEntryPrice: number;
}

export interface PaperTradeView extends PaperParticipantView {
  id: string; direction: 'buy' | 'sell'; inputAmount: number; outputAmount: number;
  feeAmount: number; priceImpactPct: number; executedAt: string;
}

export interface PublicPaperMarketView {
  thesisId: string; instrumentId: string; companyId: string; title: string; summary: string;
  tokenName: string; tokenSymbol: string; slug: string; baseReserve: number; quoteReserve: number;
  tradeCount: number; updatedAt: string; spotPrice: number;
  hasMore: { positions: boolean; trades: boolean; balances: boolean };
  positions: PaperPositionView[]; trades: PaperTradeView[];
  balances: Array<PaperParticipantView & { balance: number }>;
  viewer: { stockBalance: number; position: PaperPositionView | null } | null;
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
