import { NextResponse } from 'next/server';
import { fetchTrending, type TrendingMeme } from '@/lib/base/memecoins';
import { createRequestCache, createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';

const TTL_MS = 180_000;
const cached = createRequestCache<TrendingMeme[]>(TTL_MS, 1, 1);
const allowed = createRateLimit(60);
let lastGood: TrendingMeme[] | null = null;

export async function GET() {
  if (!allowed()) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  try {
    const tokens = await cached('trending', fetchTrending);
    lastGood = tokens;
    return NextResponse.json({ tokens, source: 'dexscreener', stale: false });
  } catch {
    if (lastGood) return NextResponse.json({ tokens: lastGood, source: 'dexscreener', stale: true, error: 'Refresh unavailable; showing previous results.' });
    return NextResponse.json({ error: 'Trending memestocks are temporarily unavailable.' }, { status: 503, headers: { 'Retry-After': '30' } });
  }
}
