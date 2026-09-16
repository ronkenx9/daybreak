import { fetchInstrumentFacts } from '@/lib/providers/xstocks';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ticker = (new URL(req.url).searchParams.get('ticker') || '').trim().toUpperCase();
  if (!/^[A-Z]{1,6}$/.test(ticker)) return Response.json({ error: 'Invalid ticker' }, { status: 400 });
  const facts = await fetchInstrumentFacts(ticker);
  if (!facts) return Response.json({ error: 'No xStocks instrument for this ticker' }, { status: 404 });
  return Response.json(facts, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
