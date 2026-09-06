import { NextResponse } from 'next/server';
import { fetchMemeTokens } from '@/lib/base/memecoins';

// Community meme tokens that reference a company. Heavily filtered and clearly
// not the company's stock. Cached briefly; empty is a valid, honest answer.
export const dynamic = 'force-dynamic';

const cache = new Map<string, { at: number; data: unknown }>();
const TTL_MS = 180_000;

export async function GET(req: Request) {
  const ticker = (new URL(req.url).searchParams.get('ticker') || '').toUpperCase();
  if (!/^[A-Z]{1,6}$/.test(ticker)) return NextResponse.json({ error: 'invalid ticker' }, { status: 400 });

  const hit = cache.get(ticker);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.data);

  try {
    const tokens = await fetchMemeTokens(ticker);
    const data = { ticker, tokens, source: 'dexscreener', disclaimer: 'Meme tokens paired against this stock on Base. Not the company or its stock; independent, speculative and high-risk.' };
    cache.set(ticker, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ticker, tokens: [], source: 'dexscreener', error: 'lookup failed' });
  }
}
