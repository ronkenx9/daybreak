import 'server-only';
import { xstockByTicker } from '@/lib/solana/xstocks-registry';

// xStocks (Backed) public API. Server-only; schema-safe parsing. Verified endpoints
// 2026-09-16. Corporate actions carry BOTH the company event and its token treatment
// (the scaled-UI-amount multiplier), which are distinct — keep them separate.
const BASE = 'https://api.xstocks.fi/api/v2/public';
const UA = 'Mozilla/5.0 (compatible; DaybreakBot/1.0; +https://www.daybreakcircles.lol)';

async function xget<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${BASE}${path}`, { headers: { accept: 'application/json', 'user-agent': UA }, signal: AbortSignal.timeout(9000), cache: 'no-store' });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null;
    return await r.json() as T;
  } catch { return null; }
}

export interface CorporateEvent {
  eventId: string; version: number; caType: string; effectiveTimeUtc: string; status: string;
  multiplierOld: number | null; multiplierNew: number | null;
  grossCashflowUsd: number | null; netCashflowUsd: number | null; withholdingTaxRate: number | null;
  fromUnits: number | null; toUnits: number | null;
}
export interface MultiplierPoint { reason: string; multiplier: number; previousMultiplier: number; activationDateTime: string }
export interface CorporateActionsResult {
  ticker: string; xSymbol: string; isin: string;
  upcoming: CorporateEvent[]; history: CorporateEvent[]; multiplierHistory: MultiplierPoint[];
}

const num = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) ? n : null; };
function normEvent(n: Record<string, unknown>): CorporateEvent {
  return {
    eventId: String(n.eventId ?? ''), version: Number(n.version ?? 1), caType: String(n.caType ?? 'Unknown'),
    effectiveTimeUtc: String(n.effectiveTimeUtc ?? ''), status: String(n.status ?? 'Unknown'),
    multiplierOld: num(n.multiplierOld), multiplierNew: num(n.multiplierNew),
    grossCashflowUsd: num(n.grossCashflowUsd), netCashflowUsd: num(n.netCashflowUsd), withholdingTaxRate: num(n.withholdingTaxRate),
    fromUnits: num(n.fromUnits), toUnits: num(n.toUnits),
  };
}

export interface InstrumentFacts {
  ticker: string; xSymbol: string; name: string; isin: string;
  underlyingIsin: string | null; underlyingCountry: string | null; currency: string | null;
  tradingHoursMode: string | null; tradingHalted: boolean; atomicHalted: boolean;
  reserve: { sharesHeld: number | null; circulatingSupply: number | null; provider: string | null; asOf: string | null } | null;
}

export async function fetchInstrumentFacts(ticker: string): Promise<InstrumentFacts | null> {
  const x = xstockByTicker(ticker);
  if (!x) return null;
  // Proof-of-reserves is a large, recency-ordered list; we link to the live PoR
  // rather than paginate hundreds of rows per request to state a specific number.
  const [asset, status] = await Promise.all([
    xget<Record<string, unknown>>(`/assets/${x.xSymbol}`),
    xget<{ isMarketTradingHalted?: boolean; isAtomicTradingHalted?: boolean }>(`/system/status/${x.xSymbol}`),
  ]);
  if (!asset) return null;
  const trading = (asset.trading ?? {}) as Record<string, unknown>;
  const underlying = (asset.underlying ?? {}) as Record<string, unknown>;
  return {
    ticker: x.ticker, xSymbol: x.xSymbol, name: String(asset.name ?? `${x.company} xStock`), isin: String(asset.isin ?? x.isin),
    underlyingIsin: asset.underlyingIsin ? String(asset.underlyingIsin) : null,
    underlyingCountry: underlying.listingCountry ? String(underlying.listingCountry) : null,
    currency: trading.currency ? String(trading.currency) : null,
    tradingHoursMode: trading.tradingHoursMode ? String(trading.tradingHoursMode) : null,
    tradingHalted: Boolean(asset.isTradingHalted), atomicHalted: Boolean(status?.isAtomicTradingHalted),
    reserve: null,
  };
}

export async function fetchCorporateActions(ticker: string): Promise<CorporateActionsResult | null> {
  const x = xstockByTicker(ticker);
  if (!x) return null;
  const [up, hist, mult] = await Promise.all([
    xget<{ nodes?: Record<string, unknown>[] }>(`/corporate-actions/upcoming?symbol=${x.xSymbol}`),
    xget<{ nodes?: Record<string, unknown>[] }>(`/corporate-actions/history?page=1&pageSize=8&symbol=${x.xSymbol}`),
    xget<{ nodes?: Record<string, unknown>[] }>(`/assets/${x.xSymbol}/multiplier/history?network=Solana`),
  ]);
  return {
    ticker: x.ticker, xSymbol: x.xSymbol, isin: x.isin,
    upcoming: (up?.nodes ?? []).map(normEvent),
    history: (hist?.nodes ?? []).map(normEvent),
    multiplierHistory: (mult?.nodes ?? []).map((m) => ({ reason: String(m.reason ?? ''), multiplier: Number(m.multiplier), previousMultiplier: Number(m.previousMultiplier), activationDateTime: String(m.activationDateTime ?? '') })),
  };
}
