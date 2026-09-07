import { NextResponse } from 'next/server';
import { STOCK_LP_MARKETS } from '@/lib/base/lp-model';
import { readLpPool } from '@/lib/base/lp';
import { createRequestCache, createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';

// One cached, server-paced read of every supported LP pool, so the Earn grid
// makes a single request instead of N concurrent fan-outs that trip an
// upstream provider rate limit.
interface PoolSummary { ticker: string; reserveUsd: number | null; volume24Usd: number | null; feeBps: number; dataStatus: 'live' | 'unavailable' }
const allowed = createRateLimit(60);
const cached = createRequestCache<PoolSummary[]>(60_000, 1, 1);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function build(): Promise<PoolSummary[]> {
  const out: PoolSummary[] = [];
  for (const ticker of Object.keys(STOCK_LP_MARKETS)) {
    try {
      const p = await readLpPool(ticker);
      out.push({ ticker, reserveUsd: p?.reserveUsd ?? null, volume24Usd: p?.volume24Usd ?? null, feeBps: p?.feeBps ?? 5, dataStatus: p?.dataStatus ?? 'unavailable' });
    } catch {
      out.push({ ticker, reserveUsd: null, volume24Usd: null, feeBps: STOCK_LP_MARKETS[ticker]?.feeBps ?? 5, dataStatus: 'unavailable' });
    }
    await sleep(250); // avoid burst traffic if the fallback source is needed
  }
  return out;
}

export async function GET() {
  if (!allowed()) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  try {
    const pools = await cached('all', build);
    return NextResponse.json({ pools }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'LP summary unavailable.' }, { status: 503, headers: { 'Retry-After': '30' } });
  }
}
