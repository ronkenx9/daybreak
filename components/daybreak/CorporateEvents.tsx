'use client';
import { useQuery } from '@tanstack/react-query';

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

// Events & impact for the stock workspace. Company event and token treatment are
// shown separately: the caType/dates are the company fact; the scaled-UI-amount
// multiplier is what the xStock issuer actually applied on Solana.
export default function CorporateEvents({ ticker }: { ticker: string }) {
  const q = useQuery({
    queryKey: ['xstocks-ca', ticker],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/xstocks/corporate-actions?ticker=${ticker}`, { signal });
      if (!r.ok) return null;
      return r.json() as Promise<Result>;
    },
    staleTime: 5 * 60_000, retry: 1,
  });
  const d = q.data;
  if (!d) return null; // no xStock for this ticker, or unavailable — stay quiet
  const events = [...d.upcoming, ...d.history]
    .filter((e, i, a) => a.findIndex((x) => x.eventId === e.eventId) === i)
    .slice(0, 6);
  if (!events.length) return null;

  return (
    <section className="db-ca">
      <div className="db-section-heading"><h3>Events &amp; impact</h3><span className="db-small-note">xStocks on Solana</span></div>
      <div className="db-ca-list">{events.map((e) => {
        const date = e.effectiveTimeUtc ? new Date(e.effectiveTimeUtc) : null;
        const treated = e.multiplierOld != null && e.multiplierNew != null;
        return (
          <div className="db-ca-item" key={`${e.eventId}-${e.version}`}>
            <div className="db-ca-head">
              <strong>{caLabel(e.caType)}</strong>
              <span className={`db-ca-status s-${e.status.toLowerCase()}`}>{e.status}</span>
            </div>
            <div className="db-ca-when">{date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Date pending'}</div>
            <div className="db-ca-rows">
              <div><span>Company event</span><b>{caLabel(e.caType)}
                {e.netCashflowUsd != null ? ` · $${e.netCashflowUsd} net / unit` : ''}
                {e.fromUnits != null && e.toUnits != null ? ` · ${e.fromUnits}→${e.toUnits} units` : ''}</b></div>
              <div><span>Token treatment</span><b>{treated ? `multiplier ${e.multiplierOld!.toFixed(6)} → ${e.multiplierNew!.toFixed(6)}` : 'Token treatment not confirmed'}</b></div>
            </div>
          </div>
        );
      })}</div>
      <p className="db-small-note">Company events sourced from xStocks (Backed). Treatment shown is for the Solana xStock; it does not establish the Base (Coinbase) token&apos;s treatment. Not investment advice.</p>
    </section>
  );
}
