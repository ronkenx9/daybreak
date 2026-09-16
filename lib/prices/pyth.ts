import 'server-only';

// Pyth equity price feeds (Equity.US.<TICKER>/USD). Feed IDs resolved from the
// Pyth catalog (hermes.pyth.network/v2/price_feeds) and verified 2026-09-16.
// The Hermes price endpoint now requires credentials, so live fetches are gated
// on PYTH_API_KEY; without it, callers fall back to another reference source.
export const PYTH_EQUITY_FEEDS: Record<string, string> = {
  AAPL: '49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688',
  AMZN: 'b5d0e0fa58a1f8b81498ae670ce93c872d14434b72c364885d4fa1b257cbb07a',
  GOOGL: '5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6',
  NVDA: 'b1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593',
  TSLA: '16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1',
  META: '78a3e3b8e676a8f73c439f5d749737034b139bbbe899ba5775216fba596607fe',
  MSFT: 'd0ca23c1cc005e004ccf1db5bf76aeb6a49218f43dac3d4b275e92de12ded4d1',
  COIN: 'fee33f2a978bf32dd6b662b65ba8083c6773b494f8401194ec1870c640860245',
  INTC: 'c1751e085ee292b8b3b9dd122a135614485a201c35dfc653553f0e28c1baf3ff',
  MSTR: 'e1e80251e5f5184f2195008382538e847fafc36f751896889dd3d1b1f6111f09',
};

const HERMES = (process.env.PYTH_HERMES_URL || 'https://hermes.pyth.network').replace(/\/$/, '');
const KEY = process.env.PYTH_API_KEY?.trim();
export const isPythConfigured = !!KEY;

export interface EquityPrice { priceUsd: number | null; conf: number | null; asOf: number | null; stale: boolean }

// Equity feeds only publish during US market hours; older than this is a closed-market
// reference (last price), not a live quote.
const FRESH_MS = 5 * 60_000;

export async function fetchPythEquityPrices(tickers: string[]): Promise<Record<string, EquityPrice>> {
  if (!KEY) return {};
  const ids = tickers.map((t) => PYTH_EQUITY_FEEDS[t]).filter(Boolean);
  if (!ids.length) return {};
  const url = new URL(`${HERMES}/v2/updates/price/latest`);
  for (const id of ids) url.searchParams.append('ids[]', id);
  url.searchParams.set('parsed', 'true');
  const r = await fetch(url, { headers: { accept: 'application/json', authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(9000), cache: 'no-store' }).catch(() => null);
  if (!r || !r.ok) return {};
  const data = await r.json().catch(() => null) as { parsed?: Array<{ id: string; price: { price: string; conf: string; expo: number; publish_time: number } }> } | null;
  const byId = new Map((data?.parsed || []).map((p) => [p.id.replace(/^0x/, ''), p]));
  const now = Date.now();
  const out: Record<string, EquityPrice> = {};
  for (const t of tickers) {
    const p = PYTH_EQUITY_FEEDS[t] ? byId.get(PYTH_EQUITY_FEEDS[t]) : undefined;
    if (!p) { out[t] = { priceUsd: null, conf: null, asOf: null, stale: true }; continue; }
    const scale = 10 ** Number(p.price.expo);
    const px = Number(p.price.price) * scale;
    const asOf = Number(p.price.publish_time) * 1000;
    out[t] = { priceUsd: px > 0 ? px : null, conf: Number(p.price.conf) * scale, asOf, stale: now - asOf > FRESH_MS };
  }
  return out;
}
