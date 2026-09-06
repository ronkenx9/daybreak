import { NextResponse } from 'next/server';
import { fetchMemeTokens } from '@/lib/base/memecoins';
import { tokenForTicker } from '@/lib/base/tokens';
import { createRequestCache, createRateLimit } from '@/lib/server/requests';

// Community meme tokens that reference a company. Heavily filtered and clearly
// not the company's stock. Cached briefly; empty is a valid, honest answer.
export const dynamic = 'force-dynamic';

const TTL_MS = 180_000;
const cached = createRequestCache<Awaited<ReturnType<typeof fetchMemeTokens>>>(TTL_MS, 20, 4);
const allowed = createRateLimit(120);
const lastGood = new Map<string, Awaited<ReturnType<typeof fetchMemeTokens>>>();

export async function GET(req: Request) {
  const ticker = (new URL(req.url).searchParams.get('ticker') || '').toUpperCase();
  if (!tokenForTicker(ticker)) return NextResponse.json({ error: 'Unsupported company' }, { status: 400 });
  if (!allowed()) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });

  try {
    const tokens = await cached(ticker, () => fetchMemeTokens(ticker));
    lastGood.set(ticker, tokens);
    const data = { ticker, tokens, source: 'dexscreener', stale: false, disclaimer: 'Meme tokens paired against this stock on Base. Not the company or its stock; independent, speculative and high-risk.' };
    return NextResponse.json(data);
  } catch {
    const previous = lastGood.get(ticker);
    if (previous) return NextResponse.json({ ticker, tokens: previous, source: 'dexscreener', stale: true, error: 'Refresh unavailable; showing previous results.' });
    return NextResponse.json({ error: 'Memestock data is temporarily unavailable.' }, { status: 503, headers: { 'Retry-After': '30' } });
  }
}
