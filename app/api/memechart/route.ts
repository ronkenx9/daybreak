import { NextResponse } from 'next/server';
import { createRequestCache, createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';

// OHLCV series for a Base or Solana token, from GeckoTerminal. We resolve the token's top
// pool ourselves (DexScreener's pair id isn't always a GeckoTerminal pool
// address), then read that pool's hourly candles priced in USD for the REQUESTED
// token's side — a stock-quoted meme must not be charted as the stock. Real
// candles only; fail closed.
interface Point { t: number; o: number; h: number; l: number; c: number; v: number }
interface Resolved { pool: string; side: 'base' | 'quote'; oriented: boolean }
interface DexPair {
  chainId?: string;
  priceUsd?: string;
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  baseToken?: { address?: string };
  quoteToken?: { address?: string };
}
type Network = 'base' | 'solana';
const gt = (network: Network) => `https://api.geckoterminal.com/api/v2/networks/${network}`;
const TTL_MS = 120_000;
// Cache the whole payload per token; allow several distinct charts in flight so
// two viewers opening different tokens don't get a "busy" error.
const cached = createRequestCache<{ points: Point[]; meta: object }>(TTL_MS, 64, 6);
const allowed = createRateLimit(120);

// address embedded in a GeckoTerminal id like "base_0xabc…".
const idAddr = (id: unknown) => typeof id === 'string' ? (id.split('_').pop() || '') : '';
const normalized = (network: Network, value: string) => network === 'base' ? value.toLowerCase() : value;

async function topPool(network: Network, token: string): Promise<Resolved | null> {
  const r = await fetch(`${gt(network)}/tokens/${token}/pools?page=1`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`pools ${r.status}`);
  const json = (await r.json()) as { data?: { attributes?: { address?: string }; relationships?: { base_token?: { data?: { id?: string } }; quote_token?: { data?: { id?: string } } } }[] };
  const p = json.data?.[0];
  const pool = p?.attributes?.address;
  if (!pool) return null;
  const base = normalized(network, idAddr(p?.relationships?.base_token?.data?.id));
  const quote = normalized(network, idAddr(p?.relationships?.quote_token?.data?.id));
  // Chart the side that IS the requested token; if we can't tell, default to base and say so.
  if (token === base) return { pool, side: 'base', oriented: true };
  if (token === quote) return { pool, side: 'quote', oriented: true };
  return { pool, side: 'base', oriented: false };
}

// Whitelisted timeframes → GeckoTerminal (timeframe, aggregate, limit). Provider
// coverage caps the interval; we never fabricate candles beyond what it returns.
const TF: Record<string, { timeframe: 'hour' | 'day'; aggregate: number; limit: number }> = {
  '1H': { timeframe: 'hour', aggregate: 1, limit: 72 },
  '4H': { timeframe: 'hour', aggregate: 4, limit: 90 },
  '1D': { timeframe: 'day', aggregate: 1, limit: 90 },
};

async function ohlcv(network: Network, pool: string, side: 'base' | 'quote', tf: string): Promise<Point[]> {
  const { timeframe, aggregate, limit } = TF[tf] ?? TF['1H'];
  const r = await fetch(`${gt(network)}/pools/${pool}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=usd&token=${side}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`ohlcv ${r.status}`);
  const json = (await r.json()) as { data?: { attributes?: { ohlcv_list?: number[][] } } };
  return (json.data?.attributes?.ohlcv_list ?? [])
    .map((row) => ({ t: Number(row[0]), o: Number(row[1]), h: Number(row[2]), l: Number(row[3]), c: Number(row[4]), v: Number(row[5]) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.c) && p.c > 0)
    .sort((a, b) => a.t - b.t);
}

// DexScreener's token response includes the current USD price and measured 24h
// change. When GeckoTerminal throttles its heavier candle endpoint, use those two
// real endpoints for a restrained start→now line rather than inventing intraday
// volatility or leaving every visible card blank.
async function readDexTrend(network: Network, token: string): Promise<Point[]> {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) return [];
  const json = await r.json() as { pairs?: DexPair[] };
  const pairs = (json.pairs ?? []).filter((pair) => {
    if (pair.chainId !== network) return false;
    const addresses = [pair.baseToken?.address ?? '', pair.quoteToken?.address ?? ''].map((value) => normalized(network, value));
    return addresses.includes(token);
  }).sort((a, b) => Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0));
  const pair = pairs.find((candidate) => Number.isFinite(Number(candidate.priceUsd)) && Number.isFinite(Number(candidate.priceChange?.h24)));
  const current = Number(pair?.priceUsd);
  const change = Number(pair?.priceChange?.h24);
  if (!(current > 0) || !Number.isFinite(change) || change <= -100) return [];
  const start = current / (1 + change / 100);
  const now = Math.floor(Date.now() / 1000);
  return [
    { t: now - 86_400, o: start, h: start, l: start, c: start, v: 0 },
    { t: now, o: current, h: current, l: current, c: current, v: 0 },
  ];
}

export async function GET(request: Request) {
  if (!allowed()) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  const params = new URL(request.url).searchParams;
  const requestedNetwork = params.get('network') || 'base';
  if (requestedNetwork !== 'base' && requestedNetwork !== 'solana') return NextResponse.json({ error: 'Invalid chart network.' }, { status: 400 });
  const network: Network = requestedNetwork;
  const token = normalized(network, (params.get('token') || '').trim());
  const tf = TF[params.get('tf') || ''] ? (params.get('tf') as string) : '1H';
  const valid = network === 'base' ? /^0x[0-9a-f]{40}$/.test(token) : /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(token);
  if (!valid) return NextResponse.json({ error: 'Invalid token address.' }, { status: 400 });
  try {
    const result = await cached(`${network}:${token}:${tf}`, async () => {
      try {
        const resolved = await topPool(network, token);
        if (resolved) {
          const points = await ohlcv(network, resolved.pool, resolved.side, tf);
          if (points.length > 1) return {
            points, source: 'geckoterminal',
            meta: {
              network, token, pool: resolved.pool, resolvedSide: resolved.side, oriented: resolved.oriented,
              quote: 'usd', tf, interval: TF[tf].timeframe, source: 'geckoterminal', generatedAt: Date.now(),
            },
          };
        }
      } catch { /* fall through to the lower-cost measured 24h trend */ }
      const points = await readDexTrend(network, token);
      return {
        points, source: points.length ? 'dexscreener' : 'unavailable',
        meta: { network, token, pool: null, resolvedSide: null, oriented: true, quote: 'usd', tf: '24H', interval: 'endpoints', source: points.length ? 'dexscreener' : 'unavailable', generatedAt: Date.now() },
      };
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const busy = e instanceof Error && e.message === 'Service busy';
    return NextResponse.json({ error: busy ? 'Chart is busy, retry shortly.' : 'Chart data is temporarily unavailable.' }, { status: 503, headers: { 'Retry-After': busy ? '5' : '30' } });
  }
}
