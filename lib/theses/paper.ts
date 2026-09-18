export const PAPER_ACCOUNT_VERSION = 1 as const;
export const PAPER_STARTING_STOCK_BALANCE = 10;
export const PAPER_STARTING_BASE_RESERVE = 100_000;
export const PAPER_STARTING_QUOTE_RESERVE = 250;
export const PAPER_FEE_BPS = 200;

export type PaperDirection = 'buy' | 'sell';

export interface PaperInstrument {
  id: string;
  symbol: string;
}

export interface PaperMarket {
  baseReserve: number;
  quoteReserve: number;
}

export interface PaperPosition {
  quantity: number;
  costBasisQuote: number;
  realizedPnlQuote: number;
}

export interface PaperTrade {
  id: string;
  instrumentId: string;
  direction: PaperDirection;
  inputAmount: number;
  outputAmount: number;
  feeAmount: number;
  priceImpactPct: number;
  executedAt: string;
}

export interface PaperAccount {
  version: typeof PAPER_ACCOUNT_VERSION;
  stockBalances: Record<string, number>;
  markets: Record<string, PaperMarket>;
  positions: Record<string, PaperPosition>;
  trades: PaperTrade[];
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

const emptyPosition = (): PaperPosition => ({ quantity: 0, costBasisQuote: 0, realizedPnlQuote: 0 });
const freshMarket = (): PaperMarket => ({ baseReserve: PAPER_STARTING_BASE_RESERVE, quoteReserve: PAPER_STARTING_QUOTE_RESERVE });

export function createPaperAccount(instruments: PaperInstrument[]): PaperAccount {
  return {
    version: PAPER_ACCOUNT_VERSION,
    stockBalances: Object.fromEntries(instruments.map((instrument) => [instrument.id, PAPER_STARTING_STOCK_BALANCE])),
    markets: Object.fromEntries(instruments.map((instrument) => [instrument.id, freshMarket()])),
    positions: Object.fromEntries(instruments.map((instrument) => [instrument.id, emptyPosition()])),
    trades: [],
  };
}

export function restorePaperAccount(value: unknown, instruments: PaperInstrument[]): PaperAccount {
  const fresh = createPaperAccount(instruments);
  if (!value || typeof value !== 'object') return fresh;
  const stored = value as Partial<PaperAccount>;
  if (stored.version !== PAPER_ACCOUNT_VERSION) return fresh;
  for (const instrument of instruments) {
    const balance = Number(stored.stockBalances?.[instrument.id]);
    const market = stored.markets?.[instrument.id];
    const position = stored.positions?.[instrument.id];
    if (Number.isFinite(balance) && balance >= 0) fresh.stockBalances[instrument.id] = balance;
    if (market && Number.isFinite(market.baseReserve) && market.baseReserve > 0 && Number.isFinite(market.quoteReserve) && market.quoteReserve > 0) {
      fresh.markets[instrument.id] = { baseReserve: market.baseReserve, quoteReserve: market.quoteReserve };
    }
    if (position && Number.isFinite(position.quantity) && position.quantity >= 0 && Number.isFinite(position.costBasisQuote) && position.costBasisQuote >= 0 && Number.isFinite(position.realizedPnlQuote)) {
      fresh.positions[instrument.id] = { quantity: position.quantity, costBasisQuote: position.costBasisQuote, realizedPnlQuote: position.realizedPnlQuote };
    }
  }
  fresh.trades = Array.isArray(stored.trades) ? stored.trades.filter((trade): trade is PaperTrade => Boolean(trade && instruments.some((instrument) => instrument.id === trade.instrumentId) && (trade.direction === 'buy' || trade.direction === 'sell') && Number.isFinite(trade.inputAmount) && trade.inputAmount > 0 && Number.isFinite(trade.outputAmount) && trade.outputAmount > 0 && Number.isFinite(trade.feeAmount) && trade.feeAmount >= 0 && Number.isFinite(trade.priceImpactPct) && trade.priceImpactPct >= 0 && typeof trade.id === 'string' && typeof trade.executedAt === 'string')).slice(0, 50) : [];
  return fresh;
}

export function paperSpotPrice(market: PaperMarket): number {
  return market.quoteReserve / market.baseReserve;
}

export function quotePaperTrade(market: PaperMarket, direction: PaperDirection, inputAmount: number): PaperQuote {
  if (!Number.isFinite(inputAmount) || inputAmount <= 0) throw new Error('Enter an amount greater than zero');
  if (!(market.baseReserve > 0) || !(market.quoteReserve > 0)) throw new Error('Paper market is unavailable');
  const feeAmount = inputAmount * PAPER_FEE_BPS / 10_000;
  const effectiveInput = inputAmount - feeAmount;
  const invariant = market.baseReserve * market.quoteReserve;
  const spotPrice = paperSpotPrice(market);
  const outputAmount = direction === 'buy'
    ? market.baseReserve - invariant / (market.quoteReserve + effectiveInput)
    : market.quoteReserve - invariant / (market.baseReserve + effectiveInput);
  if (!Number.isFinite(outputAmount) || outputAmount <= 0) throw new Error('That amount cannot be quoted');
  // Keep the displayed curve impact separate from the fee, as the live review does.
  const executionPrice = direction === 'buy' ? effectiveInput / outputAmount : outputAmount / effectiveInput;
  const priceImpactPct = Math.abs(executionPrice - spotPrice) / spotPrice * 100;
  return { direction, inputAmount, outputAmount, feeAmount, priceImpactPct, spotPrice, executionPrice };
}

export function executePaperTrade(account: PaperAccount, instrumentId: string, direction: PaperDirection, inputAmount: number, now = new Date()): PaperAccount {
  const market = account.markets[instrumentId];
  const position = account.positions[instrumentId];
  const stockBalance = account.stockBalances[instrumentId];
  if (!market || !position || !Number.isFinite(stockBalance)) throw new Error('Unknown paper market');
  const quote = quotePaperTrade(market, direction, inputAmount);
  if (direction === 'buy' && inputAmount > stockBalance + Number.EPSILON) throw new Error('Not enough paper stock tokens');
  if (direction === 'sell' && inputAmount > position.quantity + Number.EPSILON) throw new Error('Not enough paper thesis tokens');

  const nextMarket = direction === 'buy'
    ? { baseReserve: market.baseReserve - quote.outputAmount, quoteReserve: market.quoteReserve + inputAmount }
    : { baseReserve: market.baseReserve + inputAmount, quoteReserve: market.quoteReserve - quote.outputAmount };
  const nextPosition = { ...position };
  let nextStockBalance = stockBalance;
  if (direction === 'buy') {
    nextStockBalance -= inputAmount;
    nextPosition.quantity += quote.outputAmount;
    nextPosition.costBasisQuote += inputAmount;
  } else {
    const allocatedCost = position.quantity > 0 ? position.costBasisQuote * (inputAmount / position.quantity) : 0;
    nextStockBalance += quote.outputAmount;
    nextPosition.quantity -= inputAmount;
    nextPosition.costBasisQuote = Math.max(0, position.costBasisQuote - allocatedCost);
    nextPosition.realizedPnlQuote += quote.outputAmount - allocatedCost;
  }
  if (nextPosition.quantity < 1e-9) {
    nextPosition.quantity = 0;
    nextPosition.costBasisQuote = 0;
  }
  const trade: PaperTrade = {
    id: `${now.getTime()}-${account.trades.length}`,
    instrumentId,
    direction,
    inputAmount,
    outputAmount: quote.outputAmount,
    feeAmount: quote.feeAmount,
    priceImpactPct: quote.priceImpactPct,
    executedAt: now.toISOString(),
  };
  return {
    ...account,
    stockBalances: { ...account.stockBalances, [instrumentId]: nextStockBalance },
    markets: { ...account.markets, [instrumentId]: nextMarket },
    positions: { ...account.positions, [instrumentId]: nextPosition },
    trades: [trade, ...account.trades].slice(0, 50),
  };
}

export function paperPositionMetrics(account: PaperAccount, instrumentId: string) {
  const position = account.positions[instrumentId] ?? emptyPosition();
  const market = account.markets[instrumentId] ?? freshMarket();
  const spotPrice = paperSpotPrice(market);
  const marketValueQuote = position.quantity * spotPrice;
  const unrealizedPnlQuote = marketValueQuote - position.costBasisQuote;
  return {
    ...position,
    spotPrice,
    marketValueQuote,
    unrealizedPnlQuote,
    totalPnlQuote: unrealizedPnlQuote + position.realizedPnlQuote,
    averageEntryPrice: position.quantity > 0 ? position.costBasisQuote / position.quantity : 0,
  };
}
