export interface StockLpMarket {
  ticker: 'AAPL' | 'NVDA' | 'GOOGL' | 'META';
  token: `0x${string}`;
  quoteToken: `0x${string}`;
  pool: `0x${string}`;
  gauge: `0x${string}`;
  npm: `0x${string}`;
  tickSpacing: number;
  feeBps: number;
}

const NPM_EQUITY = '0xe1f8cd9AC4e4A65F54f38a5CdAfCA44f6dD68b53' as const;
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

/**
 * Aerodrome Slipstream markets from BankrBot/aero-stock-lp, commit
 * 179c4c8f64c38844544cb51b68fe073e807a782e. The upstream live self-test
 * passed against Base on 2026-09-07. Runtime reads still fail closed.
 */
export const STOCK_LP_MARKETS: Record<string, StockLpMarket> = {
  NVDA: { ticker: 'NVDA', token: '0xb20000000000000000000078ee7ce2fE4908108C', quoteToken: BASE_USDC, pool: '0x853f5f1b92b16714fe6cda67caad0856b83c7ab9', gauge: '0x30d1E5Af5CE39863E6F69a1F73ffb0e1AC9771A8', npm: NPM_EQUITY, tickSpacing: 10, feeBps: 5 },
  AAPL: { ticker: 'AAPL', token: '0xb200000000000000000000C2e324d24d7eEcd1fb', quoteToken: BASE_USDC, pool: '0xa3b1e3f9747065e2073722ff4c9027d3ea4994f0', gauge: '0x43021fBbD01b967704aB2379F6e90E2d367042F3', npm: NPM_EQUITY, tickSpacing: 10, feeBps: 5 },
  GOOGL: { ticker: 'GOOGL', token: '0xb2000000000000000000002D0BA3164cc74f58B7', quoteToken: BASE_USDC, pool: '0xb1987cad1682841b4b641d50e520777ec5ab5542', gauge: '0x225fc4369972420683dA720F6cb39C5547C4a74e', npm: NPM_EQUITY, tickSpacing: 10, feeBps: 5 },
  META: { ticker: 'META', token: '0xb2000000000000000000008bC8786B856E61707C', quoteToken: BASE_USDC, pool: '0xeaf57753bc382e0324a1d43f72e7027705a2273e', gauge: '0x536DF7362915337ddc86C9b57D322905CA819d65', npm: NPM_EQUITY, tickSpacing: 10, feeBps: 5 },
};

export function stockLpMarket(ticker: string): StockLpMarket | undefined {
  return STOCK_LP_MARKETS[ticker.toUpperCase()];
}

// These pools quote 8-decimal equities in 6-decimal USDC. Slipstream's tick
// direction is inverse to the displayed stock price.
export function stockPriceFromTick(tick: number): number {
  return 100 / Math.pow(1.0001, tick);
}

export function stockBandFromTicks(tickLower: number, tickUpper: number) {
  return {
    low: stockPriceFromTick(tickUpper),
    high: stockPriceFromTick(tickLower),
  };
}

export function markerPosition(price: number, low: number, high: number): number {
  if (![price, low, high].every(Number.isFinite) || high <= low) return 50;
  return Math.max(0, Math.min(100, ((price - low) / (high - low)) * 100));
}
