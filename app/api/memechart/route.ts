import { NextResponse } from 'next/server';
import { createRequestCache, createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';

// Close-price series for a memestock, from GeckoTerminal. We resolve the token's
// top pool ourselves (DexScreener's pair id isn't always a GeckoTerminal pool
// address), then read that pool's hourly OHLCV. Real candles only; fail closed.
interface Point { t: number; c: number }
const GT = 'https://api.geckoterminal.com/api/v2/networks/base';
const TTL_MS = 120_000;
const cached = createRequestCache<Point[]>(TTL_MS, 64, 1);
const allowed = createRateLimit(120);

async function topPool(token: string): Promise<string | null> {
  const r = await fetch(`${GT}/tokens/${token}/pools?page=1`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`pools ${r.status}`);
  const json = (await r.json()) as { data?: { attributes?: { address?: string } }[] };
  return json.data?.[0]?.attributes?.address ?? null;
}

async function ohlcv(pool: string): Promise<Point[]> {
  const r = await fetch(`${GT}/pools/${pool}/ohlcv/hour?aggregate=1&limit=48&currency=usd`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`ohlcv ${r.status}`);
  const json = (await r.json()) as { data?: { attributes?: { ohlcv_list?: number[][] } } };
  return (json.data?.attributes?.ohlcv_list ?? [])
    .map((row) => ({ t: Number(row[0]), c: Number(row[4]) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.c) && p.c > 0)
    .sort((a, b) => a.t - b.t);
}

export async function GET(request: Request) {
  if (!allowed()) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  const token = (new URL(request.url).searchParams.get('token') || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(token)) return NextResponse.json({ error: 'Invalid token address.' }, { status: 400 });
  try {
    const points = await cached(token, async () => {
      const pool = await topPool(token);
      if (!pool) return [];
      return ohlcv(pool);
    });
    return NextResponse.json({ points, source: 'geckoterminal' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Chart data is temporarily unavailable.' }, { status: 503, headers: { 'Retry-After': '30' } });
  }
}
