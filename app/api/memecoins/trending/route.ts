import { NextResponse } from 'next/server';
import { fetchTrending, type TrendingMeme } from '@/lib/base/memecoins';

export const dynamic = 'force-dynamic';

let cache: { at: number; tokens: TrendingMeme[] } | null = null;
const TTL_MS = 180_000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) return NextResponse.json({ tokens: cache.tokens, source: 'dexscreener' });
  try {
    const tokens = await fetchTrending();
    cache = { at: Date.now(), tokens };
    return NextResponse.json({ tokens, source: 'dexscreener' });
  } catch {
    return NextResponse.json({ tokens: cache?.tokens ?? [], source: 'dexscreener' });
  }
}
