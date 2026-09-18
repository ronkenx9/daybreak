import { NextResponse } from 'next/server';
import { buildConvictionLaunch } from '@/lib/solana/dbc/conviction';
import { readPreStockHoldings } from '@/lib/solana/prestocks-holdings';
import { createKeyedRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';
const limit = createKeyedRateLimit(10, 60_000);

// Build a Conviction Curve launch for a pre-IPO name. Holder-gated: the creator must
// actually hold the corresponding PreStocks token on Solana (verified on-chain here),
// which is what routes real demand to PreStocks. Returns an unsigned/partial-signed
// transaction the creator signs as fee payer.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const creator = typeof body.creator === 'string' ? body.creator : '';
  const symbol = typeof body.symbol === 'string' ? body.symbol.toUpperCase() : '';
  if (!limit(creator || 'anon')) return NextResponse.json({ error: 'Please retry shortly' }, { status: 429, headers: { 'Retry-After': '30' } });

  try {
    // Enforce the holder gate on-chain before building anything.
    const holdings = await readPreStockHoldings(creator);
    const holds = holdings.holdings.some((h) => h.symbol === symbol && BigInt(h.rawAmount) > 0n);
    if (!holds) return NextResponse.json({ error: `Hold ${symbol} on Solana to launch its belief market`, gate: 'holder' }, { status: 403 });

    const build = await buildConvictionLaunch(creator, symbol);
    return NextResponse.json(build, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not build belief market' }, { status: 400 });
  }
}
