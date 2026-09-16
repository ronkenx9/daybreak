import { fetchPythEquityPrices, isPythConfigured } from '@/lib/prices/pyth';
import { readPrices } from '@/lib/base/prices';

export const dynamic = 'force-dynamic';

interface Priced { priceUsd: number | null; source: 'pyth' | 'chainlink-ref' | 'unavailable'; asOf: number | null; stale: boolean }

// USD reference prices for equities. Prefers Pyth when PYTH_API_KEY is set; otherwise
// falls back to the Base Chainlink feeds (same underlying equity), labeled as a reference.
export async function GET(req: Request) {
  const tickers = (new URL(req.url).searchParams.get('tickers') || '')
    .split(',').map((t) => t.trim().toUpperCase()).filter(Boolean).slice(0, 20);
  if (!tickers.length) return Response.json({ prices: {}, pyth: isPythConfigured });

  const pyth = await fetchPythEquityPrices(tickers);
  const out: Record<string, Priced> = {};
  const need: string[] = [];
  for (const t of tickers) {
    const p = pyth[t];
    if (p && p.priceUsd != null) out[t] = { priceUsd: p.priceUsd, source: 'pyth', asOf: p.asOf, stale: p.stale };
    else need.push(t);
  }
  if (need.length) {
    try {
      const cl = await readPrices();
      for (const t of need) {
        const p = cl[t];
        out[t] = { priceUsd: p && p.priceUsd != null ? p.priceUsd : null, source: p && p.priceUsd != null ? 'chainlink-ref' : 'unavailable', asOf: p?.updatedAt ?? null, stale: !!p?.isStale };
      }
    } catch {
      for (const t of need) out[t] = { priceUsd: null, source: 'unavailable', asOf: null, stale: true };
    }
  }
  return Response.json({ prices: out, pyth: isPythConfigured }, { headers: { 'Cache-Control': 'private, max-age=20' } });
}
