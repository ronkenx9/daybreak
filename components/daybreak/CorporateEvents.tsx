'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ChevronDown, Coins, Split } from 'lucide-react';

interface CaEvent {
  eventId: string; version: number; caType: string; effectiveTimeUtc: string; status: string;
  multiplierOld: number | null; multiplierNew: number | null;
  grossCashflowUsd: number | null; netCashflowUsd: number | null; withholdingTaxRate: number | null;
  fromUnits: number | null; toUnits: number | null;
}
interface Result { ticker: string; xSymbol: string; isin: string; upcoming: CaEvent[]; history: CaEvent[] }

const CA_LABEL: Record<string, string> = {
  CashDividend: 'Cash dividend', StockDividend: 'Stock dividend', StockSplit: 'Stock split',
  ReverseStockSplit: 'Reverse split', Merger: 'Merger', SpinOff: 'Spin-off', TickerChange: 'Ticker change', Delisting: 'Delisting',
};
const caLabel = (t: string) => CA_LABEL[t] ?? t.replace(/([a-z])([A-Z])/g, '$1 $2');
const fmtDate = (s: string) => { const d = s ? new Date(s) : null; return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date pending'; };

// Shared fetch so both the callout (here) and the chart markers (CompanyNews) read the
// same corporate-action data. Returns null when there is no xStock twin for the ticker.
export function useCorporateActions(ticker: string) {
  return useQuery({
    queryKey: ['xstocks-ca', ticker],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/xstocks/corporate-actions?ticker=${ticker}`, { signal });
      if (!r.ok) return null;
      return r.json() as Promise<Result>;
    },
    staleTime: 5 * 60_000, retry: 1,
  });
}

// Distinct events, newest first, deduped by id.
export function mergedEvents(d: Result | null | undefined): CaEvent[] {
  if (!d) return [];
  return [...d.upcoming, ...d.history]
    .filter((e, i, a) => a.findIndex((x) => x.eventId === e.eventId) === i)
    .sort((a, b) => (Date.parse(b.effectiveTimeUtc) || 0) - (Date.parse(a.effectiveTimeUtc) || 0));
}

// Pick the single most relevant event for the callout: the soonest UPCOMING one,
// otherwise the most recent past one.
function leadEvent(events: CaEvent[]): CaEvent | null {
  const now = Date.now();
  const future = events.filter((e) => (Date.parse(e.effectiveTimeUtc) || 0) > now).sort((a, b) => Date.parse(a.effectiveTimeUtc) - Date.parse(b.effectiveTimeUtc));
  return future[0] ?? events[0] ?? null;
}

const eventIcon = (t: string) => t.includes('Dividend') ? <Coins size={16} /> : t.includes('Split') ? <Split size={16} /> : <CalendarClock size={16} />;

// Events & impact — a discoverable callout under the price that expands to the full
// list. Company event and token treatment (the xStock multiplier) are kept separate.
export default function CorporateEvents({ ticker }: { ticker: string }) {
  const [open, setOpen] = useState(false);
  const q = useCorporateActions(ticker);
  const events = mergedEvents(q.data).slice(0, 8);
  if (!q.data || !events.length) return null; // no xStock twin, or nothing on record — stay quiet

  const lead = leadEvent(events);
  const upcoming = lead ? (Date.parse(lead.effectiveTimeUtc) || 0) > Date.now() : false;
  // Only call it "treated" when a real multiplier was applied (issuers leave it 0/null
  // until the action executes) — otherwise we'd render a meaningless "0.0000 → 0.0000".
  const treated = (e: CaEvent) => e.multiplierOld != null && e.multiplierNew != null && e.multiplierNew > 0 && e.multiplierOld > 0;

  return (
    <section className="db-ca">
      <button className="db-ca-callout" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="db-ca-callout-icon">{lead ? eventIcon(lead.caType) : <CalendarClock size={16} />}</span>
        <span className="db-ca-callout-copy">
          <strong>{upcoming ? 'Upcoming' : 'Latest'} corporate action{lead ? `: ${caLabel(lead.caType)}` : ''}</strong>
          <small>{lead ? fmtDate(lead.effectiveTimeUtc) : ''}{lead && treated(lead) ? ` · multiplier ${lead.multiplierOld!.toFixed(4)} → ${lead.multiplierNew!.toFixed(4)}` : ''}{events.length > 1 ? ` · ${events.length} on record` : ''}</small>
        </span>
        <ChevronDown size={18} className={`db-ca-chevron${open ? ' is-open' : ''}`} />
      </button>

      {open && <>
        <div className="db-ca-list">{events.map((e) => (
          <div className="db-ca-item" key={`${e.eventId}-${e.version}`}>
            <div className="db-ca-head"><strong>{caLabel(e.caType)}</strong><span className={`db-ca-status s-${e.status.toLowerCase()}`}>{e.status}</span></div>
            <div className="db-ca-when">{fmtDate(e.effectiveTimeUtc)}</div>
            <div className="db-ca-rows">
              <div><span>Company event</span><b>{caLabel(e.caType)}{e.netCashflowUsd != null ? ` · $${e.netCashflowUsd} net / unit` : ''}{e.fromUnits != null && e.toUnits != null ? ` · ${e.fromUnits}→${e.toUnits} units` : ''}</b></div>
              <div><span>Token treatment</span><b>{treated(e) ? `multiplier ${e.multiplierOld!.toFixed(6)} → ${e.multiplierNew!.toFixed(6)}` : 'Token treatment not confirmed'}</b></div>
            </div>
          </div>
        ))}</div>
        <p className="db-small-note">Company events sourced from xStocks (Backed). Treatment shown is for the Solana xStock; it does not establish the Base (Coinbase) token&apos;s treatment. Not investment advice.</p>
      </>}
    </section>
  );
}
