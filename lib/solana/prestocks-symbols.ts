// Client-safe list of PreStocks symbols (mirrors the server-only registry in
// prestocks-registry.ts). No 'server-only' import, so components can use it.
export const PRESTOCK_SYMBOLS = ['ANDURIL', 'ANTHROPIC', 'FIGUREAI', 'KALSHI', 'NEURALINK', 'OPENAI', 'POLYMARKET', 'SPACEX'] as const;
export const isPreStockSymbol = (symbol: string) => (PRESTOCK_SYMBOLS as readonly string[]).includes(symbol.toUpperCase());
