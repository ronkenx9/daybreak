import { fetchUsdcToXstockQuote } from '@/lib/solana/jupiter';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const ticker = (u.searchParams.get('ticker') || '').trim().toUpperCase();
  const usdc = Number(u.searchParams.get('usdc') || '10');
  if (!/^[A-Z]{1,6}$/.test(ticker)) return Response.json({ error: 'Invalid ticker' }, { status: 400 });
  if (!(usdc > 0) || usdc > 100_000) return Response.json({ error: 'Enter an amount between 0 and 100,000 USDC' }, { status: 400 });
  const quote = await fetchUsdcToXstockQuote(ticker, usdc);
  if (!quote) return Response.json({ error: 'No Solana route available right now' }, { status: 502 });
  return Response.json(quote, { headers: { 'Cache-Control': 'no-store' } });
}
