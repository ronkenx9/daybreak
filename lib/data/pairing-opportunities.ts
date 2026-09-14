import 'server-only';
import { fetchMemeTokens, type TrendingMeme } from '@/lib/base/memecoins';
import { TOKENS, type StockToken } from '@/lib/base/tokens';

export const PAIRING_DATA_VERSION = '2026-09-14';
export const PAIRING_MIN_LIQUIDITY = 5_000;
export const PAIRING_MAX_LIMIT = 25;

export interface PairingOpportunity {
  rank: number;
  score: number;
  signal: 'emerging' | 'active' | 'established';
  stock: { ticker: string; symbol: string; name: string; address: string };
  communityToken: { symbol: string; name: string; address: string };
  pool: { address: string | null; url: string };
  metrics: {
    liquidityUsd: number;
    volume24hUsd: number;
    transactions24h: number;
    priceChange24hPct: number;
    volumeToLiquidity: number;
    ageHours: number | null;
  };
  rationale: string[];
}

export interface StockPairingCoverage {
  ticker: string;
  symbol: string;
  activePairs: number;
  totalLiquidityUsd: number;
  totalVolume24hUsd: number;
  status: 'unpaired' | 'quiet' | 'active';
}

export interface PairingIntelligence {
  asOf: string;
  window: '24h';
  methodologyVersion: string;
  opportunities: PairingOpportunity[];
  coverage: StockPairingCoverage[];
  overlookedStocks: string[];
  provenance: Array<{ source: string; role: string; url: string }>;
  caveats: string[];
}

export interface PairingQuery {
  minLiquidity: number;
  limit: number;
  window: '24h';
}

function boundedInteger(raw: string | null, fallback: number, min: number, max: number, field: string): number {
  if (raw === null || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${field} must be an integer between ${min} and ${max}`);
  }
  return value;
}

export function parsePairingQuery(url: string): PairingQuery {
  const params = new URL(url).searchParams;
  const window = params.get('window') ?? '24h';
  if (window !== '24h') throw new Error('window currently supports 24h only');
  return {
    minLiquidity: boundedInteger(params.get('minLiquidity'), PAIRING_MIN_LIQUIDITY, PAIRING_MIN_LIQUIDITY, 1_000_000, 'minLiquidity'),
    limit: boundedInteger(params.get('limit'), 10, 1, PAIRING_MAX_LIMIT, 'limit'),
    window,
  };
}

function logScore(value: number, ceiling: number): number {
  return Math.min(1, Math.log10(Math.max(0, value) + 1) / Math.log10(ceiling + 1));
}

function opportunityScore(row: TrendingMeme): number {
  const liquidity = logScore(row.liquidityUsd, 1_000_000);
  const volume = logScore(row.volume24Usd, 1_000_000);
  const activity = logScore(row.txns24, 2_000);
  const velocity = Math.min(1, row.volume24Usd / Math.max(row.liquidityUsd, 1));
  const momentum = Math.min(1, Math.abs(row.change.h24) / 100);
  return Math.round((liquidity * 0.32 + volume * 0.3 + activity * 0.18 + velocity * 0.12 + momentum * 0.08) * 100);
}

function rationale(row: TrendingMeme): string[] {
  const reasons: string[] = [];
  const velocity = row.volume24Usd / Math.max(row.liquidityUsd, 1);
  if (row.volume24Usd >= 50_000) reasons.push('meaningful 24h volume');
  if (row.liquidityUsd >= 25_000) reasons.push('above the low-liquidity threshold');
  if (row.txns24 >= 100) reasons.push('broad transaction activity');
  if (velocity >= 1) reasons.push('24h volume exceeds available liquidity');
  if (Math.abs(row.change.h24) >= 20) reasons.push('high price-movement attention');
  return reasons.length ? reasons : ['early onchain pairing activity'];
}

export function buildPairingIntelligence(
  rows: TrendingMeme[],
  stocks: StockToken[],
  query: PairingQuery,
  now = new Date(),
): PairingIntelligence {
  const eligible = rows.filter((row) => row.liquidityUsd >= query.minLiquidity);
  const ranked = eligible
    .map((row) => ({ row, score: opportunityScore(row) }))
    .sort((a, b) => b.score - a.score || b.row.volume24Usd - a.row.volume24Usd)
    .slice(0, query.limit)
    .map(({ row, score }, index): PairingOpportunity => ({
      rank: index + 1,
      score,
      signal: score >= 70 ? 'established' : score >= 45 ? 'active' : 'emerging',
      stock: {
        ticker: row.parentTicker,
        symbol: row.parentSymbol,
        name: stocks.find((stock) => stock.ticker === row.parentTicker)?.name ?? row.parentTicker,
        address: stocks.find((stock) => stock.ticker === row.parentTicker)?.token ?? '',
      },
      communityToken: { symbol: row.symbol, name: row.name, address: row.address },
      pool: { address: row.pairAddress, url: row.url },
      metrics: {
        liquidityUsd: row.liquidityUsd,
        volume24hUsd: row.volume24Usd,
        transactions24h: row.txns24,
        priceChange24hPct: row.change.h24,
        volumeToLiquidity: Number((row.volume24Usd / Math.max(row.liquidityUsd, 1)).toFixed(4)),
        ageHours: row.ageMs === null ? null : Number((row.ageMs / 3_600_000).toFixed(1)),
      },
      rationale: rationale(row),
    }));

  const coverage = stocks.map((stock): StockPairingCoverage => {
    const matches = eligible.filter((row) => row.parentTicker === stock.ticker);
    const totalLiquidityUsd = matches.reduce((sum, row) => sum + row.liquidityUsd, 0);
    const totalVolume24hUsd = matches.reduce((sum, row) => sum + row.volume24Usd, 0);
    return {
      ticker: stock.ticker,
      symbol: stock.onchainSymbol,
      activePairs: matches.length,
      totalLiquidityUsd,
      totalVolume24hUsd,
      status: matches.length === 0 ? 'unpaired' : totalVolume24hUsd < 5_000 ? 'quiet' : 'active',
    };
  }).sort((a, b) => b.totalVolume24hUsd - a.totalVolume24hUsd || b.totalLiquidityUsd - a.totalLiquidityUsd);

  return {
    asOf: now.toISOString(),
    window: query.window,
    methodologyVersion: PAIRING_DATA_VERSION,
    opportunities: ranked,
    coverage,
    overlookedStocks: coverage.filter((stock) => stock.status === 'unpaired').map((stock) => stock.ticker),
    provenance: [
      { source: 'Base B20 registry', role: 'verified stock-token universe', url: 'https://docs.base.org/specifications/b20/tokenized-stocks-on-base' },
      { source: 'DexScreener', role: 'Base pool liquidity, volume and transaction observations', url: 'https://dexscreener.com/base' },
      { source: 'Daybreak', role: 'pair validation, filtering, coverage and opportunity scoring', url: 'https://www.daybreakcircles.lol' },
    ],
    caveats: [
      'Scores describe onchain activity, not investment quality or expected returns.',
      'Only direct pools against Daybreak’s verified Base stock-token allowlist are included.',
      'Provider observations can lag, change, or be temporarily unavailable.',
    ],
  };
}

export async function fetchPairingIntelligence(query: PairingQuery): Promise<PairingIntelligence> {
  const results = await Promise.allSettled(TOKENS.map(async (stock) => {
    const rows = await fetchMemeTokens(stock.ticker);
    return rows.map((row): TrendingMeme => ({ ...row, parentTicker: stock.ticker, parentSymbol: stock.onchainSymbol }));
  }));
  if (!results.some((result) => result.status === 'fulfilled')) throw new Error('Pairing providers unavailable');
  const rows = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  return buildPairingIntelligence(rows, TOKENS, query);
}
