export const PAPER_STARTING_STOCK_BALANCE = 10;
export const PAPER_STARTING_BASE_RESERVE = 100_000;
export const PAPER_STARTING_QUOTE_RESERVE = 250;
export const PAPER_FEE_BPS = 200;

export type PaperDirection = 'buy' | 'sell';

export interface PaperMarket {
  baseReserve: number;
  quoteReserve: number;
}

export interface PaperQuote {
  direction: PaperDirection;
  inputAmount: number;
  outputAmount: number;
  feeAmount: number;
  priceImpactPct: number;
  spotPrice: number;
  executionPrice: number;
}

export interface PublicPaperThesisInput {
  instrumentId: string;
  title: string;
  summary: string;
  tokenName: string;
  tokenSymbol: string;
}

function bounded(value: unknown, label: string, min: number, max: number): string {
  const clean = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (clean.length < min || clean.length > max) throw new Error(`${label} must be ${min}..${max} characters`);
  return clean;
}

export function normalizePublicPaperThesis(value: Record<string, unknown>): PublicPaperThesisInput {
  const tokenSymbol = bounded(value.tokenSymbol, 'tokenSymbol', 2, 10).toUpperCase();
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(tokenSymbol)) throw new Error('tokenSymbol must use 2–10 letters or numbers');
  return {
    instrumentId: bounded(value.instrumentId, 'instrumentId', 10, 100),
    title: bounded(value.title, 'title', 8, 100),
    summary: bounded(value.summary, 'summary', 20, 280),
    tokenName: bounded(value.tokenName, 'tokenName', 3, 32),
    tokenSymbol,
  };
}

export function paperSpotPrice(market: PaperMarket): number {
  if (!(market.baseReserve > 0) || !(market.quoteReserve > 0)) throw new Error('Paper market is unavailable');
  return market.quoteReserve / market.baseReserve;
}

export function quotePaperTrade(market: PaperMarket, direction: PaperDirection, inputAmount: number): PaperQuote {
  if (direction !== 'buy' && direction !== 'sell') throw new Error('Choose Back or Sell');
  if (!Number.isFinite(inputAmount) || inputAmount <= 0 || inputAmount > 1_000_000) throw new Error('Enter a valid amount greater than zero');
  const spotPrice = paperSpotPrice(market);
  const feeAmount = inputAmount * PAPER_FEE_BPS / 10_000;
  const effectiveInput = inputAmount - feeAmount;
  const invariant = market.baseReserve * market.quoteReserve;
  const outputAmount = direction === 'buy'
    ? market.baseReserve - invariant / (market.quoteReserve + effectiveInput)
    : market.quoteReserve - invariant / (market.baseReserve + effectiveInput);
  if (!Number.isFinite(outputAmount) || outputAmount <= 0) throw new Error('That amount cannot be quoted');
  const executionPrice = direction === 'buy' ? effectiveInput / outputAmount : outputAmount / effectiveInput;
  const priceImpactPct = Math.abs(executionPrice - spotPrice) / spotPrice * 100;
  return { direction, inputAmount, outputAmount, feeAmount, priceImpactPct, spotPrice, executionPrice };
}

export function paperPositionMetrics(position: { quantity: number; costBasisQuote: number; realizedPnlQuote: number }, spotPrice: number) {
  const marketValueQuote = position.quantity * spotPrice;
  const unrealizedPnlQuote = marketValueQuote - position.costBasisQuote;
  return {
    ...position,
    marketValueQuote,
    unrealizedPnlQuote,
    totalPnlQuote: unrealizedPnlQuote + position.realizedPnlQuote,
    averageEntryPrice: position.quantity > 0 ? position.costBasisQuote / position.quantity : 0,
  };
}
