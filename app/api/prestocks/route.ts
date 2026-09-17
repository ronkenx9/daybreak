import { NextResponse } from 'next/server';
import { fetchPreStocks } from '@/lib/providers/prestocks';
import { createRequestCache, createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';

const cached = createRequestCache<Awaited<ReturnType<typeof fetchPreStocks>>>(30_000, 1, 1);
const allowed = createRateLimit(120);

export async function GET() {
  if (!allowed()) return NextResponse.json({ items: [], error: 'Please retry shortly' }, { status: 429, headers: { 'Retry-After': '30' } });
  const data = await cached('prestocks', fetchPreStocks);
  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=30' } });
}
