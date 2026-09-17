import { NextResponse } from 'next/server';
import { quoteDbcBuy } from '@/lib/solana/dbc/trade';
import { createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';
const allowed = createRateLimit(120);

// Native on-curve BUY quote for a live DBC pool (USDC -> token).
export async function GET(req: Request) {
  if (!allowed()) return NextResponse.json({ error: 'Please retry shortly' }, { status: 429, headers: { 'Retry-After': '30' } });
  const u = new URL(req.url);
  const pool = u.searchParams.get('pool') ?? '';
  const amount = u.searchParams.get('amount') ?? '';
  const slippage = Number(u.searchParams.get('slippage') ?? '100');
  try {
    const quote = await quoteDbcBuy(pool, amount, Number.isFinite(slippage) ? slippage : 100);
    return NextResponse.json(quote, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Quote unavailable' }, { status: 400 });
  }
}
