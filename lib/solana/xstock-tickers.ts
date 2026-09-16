// Client-safe list of tickers that have a Solana xStock (mirrors the server-only
// registry in xstocks-registry.ts). No 'server-only' import, so components can use it.
export const XSTOCK_TICKERS = ['AAPL', 'AMZN', 'GOOGL', 'NVDA', 'TSLA', 'META', 'MSFT', 'COIN', 'INTC', 'MSTR'] as const;
export const isXstockTicker = (ticker: string) => (XSTOCK_TICKERS as readonly string[]).includes(ticker.toUpperCase());
