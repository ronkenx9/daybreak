import 'server-only';
import { isAddress, parseAbi } from 'viem';
import { baseClient } from './client';
import { stockBandFromTicks, stockLpMarket, stockPriceFromTick, type StockLpMarket } from './lp-model';

const gaugeAbi = parseAbi(['function stakedValues(address account) view returns (uint256[])']);
const nftAbi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, int24 tickSpacing, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
]);
const poolAbi = parseAbi(['function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, bool unlocked)']);

export interface LpPositionSummary {
  ticker: string;
  tokenId: string;
  route: 'fees' | 'aero-emissions';
  inRange: boolean;
  currentPrice: number;
  band: { low: number; high: number };
}

export interface LpPoolSnapshot {
  ticker: string;
  pool: string;
  gauge: string;
  feeBps: number;
  reserveUsd: number | null;
  volume24Usd: number | null;
  change24Pct: number | null;
  observedAt: string;
  sourceUrl: string;
  dataStatus: 'live' | 'unavailable';
}

type RawPosition = readonly [bigint, `0x${string}`, `0x${string}`, `0x${string}`, number, number, number, bigint, bigint, bigint, bigint, bigint];

function finite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type DexPair = {
  chainId?: string;
  pairAddress?: string;
  liquidity?: { usd?: number | string };
  volume?: { h24?: number | string };
  priceChange?: { h24?: number | string };
  url?: string;
};

function unavailable(market: StockLpMarket, sourceUrl: string): LpPoolSnapshot {
  return {
    ticker: market.ticker, pool: market.pool, gauge: market.gauge, feeBps: market.feeBps,
    reserveUsd: null, volume24Usd: null, change24Pct: null,
    observedAt: new Date().toISOString(), sourceUrl, dataStatus: 'unavailable',
  };
}

async function readDexScreenerPool(market: StockLpMarket): Promise<LpPoolSnapshot> {
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${market.token}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 30 },
  });
  if (!response.ok) throw new Error(`DexScreener returned ${response.status}`);
  const json = await response.json() as { pairs?: DexPair[] };
  const pair = json.pairs?.find((candidate) =>
    candidate.chainId === 'base' && candidate.pairAddress?.toLowerCase() === market.pool.toLowerCase()
  );
  if (!pair) throw new Error('Exact Aerodrome pool not indexed by DexScreener');
  return {
    ticker: market.ticker, pool: market.pool, gauge: market.gauge, feeBps: market.feeBps,
    reserveUsd: finite(pair.liquidity?.usd),
    volume24Usd: finite(pair.volume?.h24),
    change24Pct: finite(pair.priceChange?.h24),
    observedAt: new Date().toISOString(),
    sourceUrl: `https://dexscreener.com/base/${market.pool}`,
    dataStatus: 'live',
  };
}

async function readGeckoTerminalPool(market: StockLpMarket): Promise<LpPoolSnapshot> {
  const sourceUrl = `https://www.geckoterminal.com/base/pools/${market.pool}`;
  const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/base/pools/${market.pool}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 30 },
  });
  if (!response.ok) throw new Error(`GeckoTerminal returned ${response.status}`);
  const json = await response.json() as { data?: { attributes?: { reserve_in_usd?: string; volume_usd?: { h24?: string }; price_change_percentage?: { h24?: string } } } };
  const attributes = json.data?.attributes;
  return {
    ticker: market.ticker, pool: market.pool, gauge: market.gauge, feeBps: market.feeBps,
    reserveUsd: finite(attributes?.reserve_in_usd),
    volume24Usd: finite(attributes?.volume_usd?.h24),
    change24Pct: finite(attributes?.price_change_percentage?.h24),
    observedAt: new Date().toISOString(), sourceUrl, dataStatus: 'live',
  };
}

export async function readLpPool(ticker: string): Promise<LpPoolSnapshot | null> {
  const market = stockLpMarket(ticker);
  if (!market) return null;
  try {
    // DexScreener gives this project a higher read allowance for the multi-pool
    // grid. Match the returned pair to the known on-chain Aerodrome address;
    // never select a same-ticker lookalike or a different DEX route.
    return await readDexScreenerPool(market);
  } catch {
    try {
      return await readGeckoTerminalPool(market);
    } catch {
      return unavailable(market, `https://dexscreener.com/base/${market.pool}`);
    }
  }
}

async function readDetails(market: StockLpMarket, tokenId: bigint, route: LpPositionSummary['route']): Promise<LpPositionSummary | null> {
  try {
    const [raw, slot] = await Promise.all([
      baseClient.readContract({ address: market.npm, abi: nftAbi, functionName: 'positions', args: [tokenId] }) as Promise<RawPosition>,
      baseClient.readContract({ address: market.pool, abi: poolAbi, functionName: 'slot0' }),
    ]);
    const token1 = raw[3];
    const spacing = Number(raw[4]);
    const tickLower = Number(raw[5]);
    const tickUpper = Number(raw[6]);
    const liquidity = raw[7];
    const token0 = raw[2];
    if (
      token0.toLowerCase() !== market.quoteToken.toLowerCase() ||
      token1.toLowerCase() !== market.token.toLowerCase() ||
      spacing !== market.tickSpacing ||
      liquidity === 0n
    ) return null;
    const currentTick = Number(slot[1]);
    return {
      ticker: market.ticker,
      tokenId: tokenId.toString(),
      route,
      inRange: currentTick >= tickLower && currentTick < tickUpper,
      currentPrice: stockPriceFromTick(currentTick),
      band: stockBandFromTicks(tickLower, tickUpper),
    };
  } catch {
    return null;
  }
}

export async function readWalletLpPositions(address: string, ticker: string): Promise<{ positions: LpPositionSummary[]; partial: boolean }> {
  if (!isAddress(address)) throw new Error('Invalid wallet address');
  const market = stockLpMarket(ticker);
  if (!market) return { positions: [], partial: false };
  let partial = false;
  const found: { tokenId: bigint; route: LpPositionSummary['route'] }[] = [];

  try {
    const staked = await baseClient.readContract({ address: market.gauge, abi: gaugeAbi, functionName: 'stakedValues', args: [address] });
    for (const tokenId of staked) found.push({ tokenId, route: 'aero-emissions' });
  } catch { partial = true; }

  try {
    const balance = await baseClient.readContract({ address: market.npm, abi: nftAbi, functionName: 'balanceOf', args: [address] });
    const count = Math.min(Number(balance), 50);
    if (Number(balance) > count) partial = true;
    const ids = await Promise.allSettled(Array.from({ length: count }, (_, index) =>
      baseClient.readContract({ address: market.npm, abi: nftAbi, functionName: 'tokenOfOwnerByIndex', args: [address, BigInt(index)] })
    ));
    for (const result of ids) {
      if (result.status === 'fulfilled') found.push({ tokenId: result.value, route: 'fees' });
      else partial = true;
    }
  } catch { partial = true; }

  const unique = [...new Map(found.map((item) => [item.tokenId.toString(), item])).values()];
  const details = await Promise.all(unique.map((item) => readDetails(market, item.tokenId, item.route)));
  if (details.some((item) => item === null) && unique.length) partial = true;
  return { positions: details.filter((item): item is LpPositionSummary => item !== null), partial };
}
