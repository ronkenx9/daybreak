import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { stockLpMarket } from '@/lib/base/lp-model';
import { readLpPool, readWalletLpPositions } from '@/lib/base/lp';
import { createRequestCache, createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';
const allowed = createRateLimit(180);
// 16 entries covers every supported pool without eviction thrash; small
// concurrency protects upstream liquidity providers from burst traffic.
const pools = createRequestCache<Awaited<ReturnType<typeof readLpPool>>>(30_000, 16, 3);

export async function GET(request: Request) {
  if (!allowed()) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  const url = new URL(request.url);
  const ticker = (url.searchParams.get('ticker') || '').toUpperCase();
  const address = url.searchParams.get('address');
  if (!stockLpMarket(ticker)) return NextResponse.json({ error: 'This stock does not have a supported Daybreak LP route.' }, { status: 404 });
  if (address && !isAddress(address)) return NextResponse.json({ error: 'Invalid wallet address.' }, { status: 400 });
  try {
    const [pool, wallet] = await Promise.all([
      pools(ticker, () => readLpPool(ticker)),
      address ? readWalletLpPositions(address, ticker) : Promise.resolve(null),
    ]);
    return NextResponse.json({ pool, wallet }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'LP data is temporarily unavailable.' }, { status: 503, headers: { 'Retry-After': '30' } });
  }
}
