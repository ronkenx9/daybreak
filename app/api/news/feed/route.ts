import { NextResponse } from 'next/server';
import { fetchNewsFeed } from '@/lib/news/provider';
import { createRequestCache, createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';
const cached = createRequestCache<Awaited<ReturnType<typeof fetchNewsFeed>>>(10 * 60000, 1, 1);
const allowed = createRateLimit(60);
let nextUpstream = 0;
let lastGood: Awaited<ReturnType<typeof fetchNewsFeed>> | null = null;

export async function GET() {
  if (!allowed()) return NextResponse.json({ error: 'Please retry shortly', items: [] }, { status: 429, headers: { 'Retry-After': '60' } });
  try {
    const data = await cached('feed', () => { if (Date.now() < nextUpstream) throw Error('cooldown'); nextUpstream = Date.now() + 8000; return fetchNewsFeed(); });
    lastGood = data;
    return NextResponse.json({ ...data, stale: false }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    if (lastGood) return NextResponse.json({ ...lastGood, stale: true }, { headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json({ error: 'News feed is temporarily unavailable.', items: [] }, { status: 503, headers: { 'Retry-After': '30' } });
  }
}
