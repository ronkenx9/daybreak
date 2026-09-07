import { NextResponse } from 'next/server';
import { createRequestCache, createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';

// OHLCV series for a memestock, from GeckoTerminal. We resolve the token's top
// pool ourselves (DexScreener's pair id isn't always a GeckoTerminal pool
// address), then read that pool's hourly candles priced in USD for the REQUESTED
// token's side — a stock-quoted meme must not be charted as the stock. Real
// candles only; fail closed.
interface Point { t: number; o: number; h: number; l: number; c: number; v: number }
interface Resolved { pool: string; side: 'base' | 'quote'; oriented: boolean }
const GT = 'https://api.geckoterminal.com/api/v2/networks/base';
const TTL_MS = 120_000;
// Cache the whole payload per token; allow several distinct charts in flight so
// two viewers opening different tokens don't get a "busy" error.
const cached = createRequestCache<{ points: Point[]; meta: object }>(TTL_MS, 64, 6);
const allowed = createRateLimit(120);

// address embedded in a GeckoTerminal id like "base_0xabc…".
const idAddr = (id: unknown) => typeof id === 'string' ? (id.split('_').pop() || '').toLowerCase() : '';

async function topPool(token: string): Promise<Resolved | null> {
  const r = await fetch(`${GT}/tokens/${token}/pools?page=1`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`pools ${r.status}`);
  const json = (await r.json()) as { data?: { attributes?: { address?: string }; relationships?: { base_token?: { data?: { id?: string } }; quote_token?: { data?: { id?: string } } } }[] };
  const p = json.data?.[0];
  const pool = p?.attributes?.address;
  if (!pool) return null;
  const base = idAddr(p?.relationships?.base_token?.data?.id);
  const quote = idAddr(p?.relationships?.quote_token?.data?.id);
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

async function ohlcv(pool: string, side: 'base' | 'quote', tf: string): Promise<Point[]> {
  const { timeframe, aggregate, limit } = TF[tf] ?? TF['1H'];
  const r = await fetch(`${GT}/pools/${pool}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=usd&token=${side}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`ohlcv ${r.status}`);
  const json = (await r.json()) as { data?: { attributes?: { ohlcv_list?: number[][] } } };
  return (json.data?.attributes?.ohlcv_list ?? [])
    .map((row) => ({ t: Number(row[0]), o: Number(row[1]), h: Number(row[2]), l: Number(row[3]), c: Number(row[4]), v: Number(row[5]) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.c) && p.c > 0)
    .sort((a, b) => a.t - b.t);
}

export async function GET(request: Request) {
  if (!allowed()) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  const params = new URL(request.url).searchParams;
  const token = (params.get('token') || '').toLowerCase();
  const tf = TF[params.get('tf') || ''] ? (params.get('tf') as string) : '1H';
  if (!/^0x[0-9a-f]{40}$/.test(token)) return NextResponse.json({ error: 'Invalid token address.' }, { status: 400 });
  try {
    const result = await cached(`${token}:${tf}`, async () => {
      const resolved = await topPool(token);
      if (!resolved) return { points: [], meta: { token, pool: null, resolvedSide: null, oriented: false, tf } };
      const points = await ohlcv(resolved.pool, resolved.side, tf);
      return {
        points,
        meta: {
          token, pool: resolved.pool, resolvedSide: resolved.side, oriented: resolved.oriented,
          quote: 'usd', tf, interval: TF[tf].timeframe, source: 'geckoterminal', generatedAt: Date.now(),
        },
      };
    });
    return NextResponse.json({ ...result, source: 'geckoterminal' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const busy = e instanceof Error && e.message === 'Service busy';
    return NextResponse.json({ error: busy ? 'Chart is busy, retry shortly.' : 'Chart data is temporarily unavailable.' }, { status: 503, headers: { 'Retry-After': busy ? '5' : '30' } });
  }
}
