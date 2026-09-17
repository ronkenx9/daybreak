import { NextResponse } from 'next/server';
import { fetchPreStockNews } from '@/lib/news/prestocks-news';
import { createRequestCache, createRateLimit } from '@/lib/server/requests';
import { isPreStockSymbol } from '@/lib/solana/prestocks-symbols';

export const dynamic = 'force-dynamic';

const cached = createRequestCache<Awaited<ReturnType<typeof fetchPreStockNews>>>(60_000, 16, 2);
const allowed = createRateLimit(120);

export async function GET(req: Request) {
  if (!allowed()) return NextResponse.json({ items: [], error: 'Please retry shortly' }, { status: 429, headers: { 'Retry-After': '30' } });
  const symbol = (new URL(req.url).searchParams.get('symbol') || '').toUpperCase();
  if (!isPreStockSymbol(symbol)) return NextResponse.json({ items: [], error: 'Unknown symbol' }, { status: 400 });
  const data = await cached(symbol, () => fetchPreStockNews(symbol));
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=60' } });
}
