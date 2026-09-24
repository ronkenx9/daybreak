import { NextResponse } from 'next/server';
import { readXLayerSupply, type XLayerSnapshot, type XLayerStockSupply } from '@/lib/xlayer/stocks';
import { XLAYER_CHAIN_ID, XLAYER_STABLECOINS, XLAYER_STOCKS, XLAYER_STOCKS_SOURCE, XLAYER_STOCKS_VERIFIED_AT, xlayerStockFor } from '@/lib/xlayer/tokens';
import { createRequestCache, createRateLimit } from '@/lib/server/requests';
export const dynamic = 'force-dynamic';
const cached = createRequestCache<XLayerSnapshot<XLayerStockSupply>>(30000); const allowed = createRateLimit();
// Verified xStocks registry on X Layer with a live on-chain supply snapshot.
// ?symbol=TSLA narrows to one stock. The registry is returned even if the RPC is down.
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get('symbol');
  const stocks = symbol ? [xlayerStockFor(symbol)].filter((s) => !!s) : XLAYER_STOCKS;
  if (symbol && !stocks.length) return NextResponse.json({ error: 'Not an xStock on X Layer' }, { status: 404 });
  if (!allowed()) return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429, headers: { 'Retry-After': '60' } });
  const registry = { chainId: XLAYER_CHAIN_ID, issuer: 'xStocks (Backed)', source: XLAYER_STOCKS_SOURCE, verifiedAt: XLAYER_STOCKS_VERIFIED_AT, stablecoins: XLAYER_STABLECOINS };
  try {
    const onchain = await cached(symbol ? stocks[0]!.symbol : 'all', () => readXLayerSupply(stocks));
    return NextResponse.json({ ...registry, ...onchain }, { headers: { 'Cache-Control': 'public, s-maxage=30' } });
  } catch {
    return NextResponse.json({ ...registry, status: 'unavailable', items: stocks }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
