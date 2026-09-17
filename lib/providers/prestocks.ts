import 'server-only';
import { PRESTOCK_BY_SYMBOL } from '@/lib/solana/prestocks-registry';
import { saveSnapshot, loadSnapshot } from '@/lib/news/cache';

// PreStocks public API — tokenized pre-IPO companies on Solana. Server-only,
// schema-safe parsing. Verified 2026-09-17: returns an array of 8 tokens with
// markPrice/tokenPrice/impliedValuation/supply. We keep only symbols in our
// verified registry so an API change can never introduce an unvetted mint.
const API = 'https://prestocks.com/api/prestocks';
const UA = 'Mozilla/5.0 (compatible; DaybreakBot/1.0; +https://www.daybreakcircles.lol)';
const SNAPSHOT_KEY = 'prestocks:v1';

export interface PreStockQuote {
  symbol: string; company: string; mint: string; image: string; externalUrl: string;
  tokenPrice: number | null;   // live trading price of the token
  markPrice: number | null;    // reference/mark price of the underlying
  impliedValuation: number | null; // company valuation implied by tokenPrice
  markValuation: number | null;
  supply: number | null;
  premiumPct: number | null;   // (tokenPrice - markPrice) / markPrice, if both known
}

const num = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

function normalize(raw: unknown): PreStockQuote[] {
  if (!Array.isArray(raw)) return [];
  const out: PreStockQuote[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const symbol = typeof r?.symbol === 'string' ? r.symbol.toUpperCase() : '';
    const reg = PRESTOCK_BY_SYMBOL[symbol];
    if (!reg) continue; // only verified registry symbols; identity is the mint
    // Trust the registry mint (verified on-chain), not the API's contract_address.
    const tokenPrice = num(r.tokenPrice);
    const markPrice = num(r.markPrice);
    const premiumPct = tokenPrice != null && markPrice != null ? (tokenPrice - markPrice) / markPrice : null;
    out.push({
      symbol, company: reg.company, mint: reg.mint, image: reg.image, externalUrl: reg.externalUrl,
      tokenPrice, markPrice, impliedValuation: num(r.impliedValuation), markValuation: num(r.markValuation),
      supply: num(r.supply), premiumPct,
    });
  }
  out.sort((a, b) => a.company.localeCompare(b.company));
  return out;
}

// Live quotes with last-good fallback. Never throws to the caller: on upstream
// failure it serves the last cached snapshot (stale) so discovery stays populated.
export async function fetchPreStocks(): Promise<{ items: PreStockQuote[]; stale: boolean }> {
  try {
    const r = await fetch(API, { headers: { accept: 'application/json', 'user-agent': UA }, signal: AbortSignal.timeout(9000), cache: 'no-store' });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('bad response');
    const items = normalize(await r.json());
    if (!items.length) throw new Error('empty');
    await saveSnapshot(SNAPSHOT_KEY, items);
    return { items, stale: false };
  } catch {
    const cached = await loadSnapshot<PreStockQuote[]>(SNAPSHOT_KEY, null);
    return { items: cached ?? [], stale: true };
  }
}
