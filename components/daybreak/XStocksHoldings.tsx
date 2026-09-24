'use client';
import { useQuery } from '@tanstack/react-query';
import { StockIcon } from './Identity';
import { useAccountState } from './AccountProvider';

interface SolHolding { ticker: string; company: string; xSymbol: string; mint: string; decimals: number; rawAmount: string; quantity: string }
interface Snap { address: string; chain: string; slot: number; holdings: SolHolding[] }
interface XLayerHolding { ticker: string; symbol: string; name: string; shares: string }
interface XLayerSnap { items: XLayerHolding[] }
interface Row { ticker: string; company: string; quantity: string; chains: { label: string; amount: string }[] }

const num = (v: string) => parseFloat(v.replace(/,/g, ''));
const fmtQty = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 6 });

// xStocks are one product issued on several chains. Show one position per company, with
// the chain split as detail. Coinbase stock tokens on Base are a different product and
// stay in their own list.
export default function XStocksHoldings() {
  const account = useAccountState();
  const address = account.solanaWallet || undefined;
  const evm = account.user?.wallet || undefined;
  const q = useQuery({
    queryKey: ['sol-holdings', address],
    enabled: !!address,
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/solana/holdings?address=${address}`, { signal, cache: 'no-store' });
      if (!r.ok) throw new Error('unavailable');
      return r.json() as Promise<Snap>;
    },
    staleTime: 20_000, refetchInterval: 60_000, retry: 1,
  });
  const x = useQuery({
    queryKey: ['xlayer-holdings', evm],
    enabled: !!evm,
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/xlayer/holdings?address=${evm}`, { signal, cache: 'no-store' });
      if (!r.ok) throw new Error('unavailable');
      return r.json() as Promise<XLayerSnap>;
    },
    staleTime: 20_000, refetchInterval: 60_000, retry: 1,
  });
  const byTicker = new Map<string, Row>();
  const add = (ticker: string, company: string, label: string, amount: number) => {
    const row = byTicker.get(ticker) ?? { ticker, company, quantity: '0', chains: [] };
    row.quantity = String(num(row.quantity) + amount);
    row.chains.push({ label, amount: fmtQty(amount) });
    byTicker.set(ticker, row);
  };
  for (const h of q.data?.holdings ?? []) add(h.ticker, h.company, 'Solana', num(h.quantity));
  for (const h of x.data?.items ?? []) add(h.ticker, h.name, 'X Layer', num(h.shares));
  const rows = [...byTicker.values()].map((r) => ({ ...r, quantity: fmtQty(num(r.quantity)) }));
  const pending = (!!address && q.isPending) || (!!evm && x.isPending);
  const failed = [address && q.isError ? 'Solana' : null, evm && x.isError ? 'X Layer' : null].filter(Boolean);
  const tickers = rows.map((h) => h.ticker);
  const prices = useQuery({
    queryKey: ['equity-prices', tickers.join(',')],
    enabled: tickers.length > 0,
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/equity-prices?tickers=${tickers.join(',')}`, { signal });
      return r.json() as Promise<{ prices: Record<string, { priceUsd: number | null; source: string; stale: boolean }>; market?: { session: string; open: boolean } }>;
    },
    staleTime: 20_000, refetchInterval: 60_000, retry: 1,
  });
  if (!account.authenticated) return null;

  const usd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const priceOf = (t: string) => prices.data?.prices?.[t];
  const market = prices.data?.market;
  const priceLabel = market?.open ? 'live' : market?.session === 'pre' ? 'pre-market' : market?.session === 'post' ? 'after-hours' : 'last close';
  const marketNote = market ? (market.open ? 'Market open' : market.session === 'pre' ? 'Pre-market' : market.session === 'post' ? 'After-hours' : 'Market closed') : '';
  let total = 0; let priced = 0;
  for (const h of rows) { const p = priceOf(h.ticker); if (p?.priceUsd != null) { total += parseFloat(h.quantity.replace(/,/g, '')) * p.priceUsd; priced++; } }

  return (
    <section className="db-portfolio" aria-label="xStocks holdings">
      <div className="db-section-heading"><h2>xStocks</h2><span className="db-small-note">Solana · X Layer{marketNote ? ` · ${marketNote}` : ''}</span></div>
      {failed.length > 0 && <p role="status" className="db-data-notice">{failed.join(' and ')} balances are unavailable right now. They have not been reported as zero.</p>}
      {!address && !evm ? <p className="db-small-note">Your wallets are loading…</p>
        : pending && rows.length === 0 ? <p className="db-small-note">Reading balances on Solana and X Layer…</p>
        : rows.length === 0 ? (failed.length ? null : <p className="db-small-note">No xStocks found in your wallets yet.</p>)
        : <>
          {priced > 0 && <div className="db-portfolio-value"><span>Reference value</span><h2 className="db-shine">{usd(total)}</h2></div>}
          <div className="db-holdings-list">{rows.map((h) => {
            const p = priceOf(h.ticker);
            const value = p?.priceUsd != null ? parseFloat(h.quantity.replace(/,/g, '')) * p.priceUsd : null;
            return (
              <div className="db-holding-row" key={h.ticker}>
                <StockIcon ticker={h.ticker} size={44} />
                <div className="db-holding-main"><strong>{h.company}</strong><small>{h.quantity} shares · {h.chains.map((c) => `${c.label} ${c.amount}`).join(' · ')}</small></div>
                <div className="db-holding-val"><strong className="db-shine">{value != null ? usd(value) : h.quantity}</strong><small>{value != null ? priceLabel : 'shares'}</small></div>
              </div>
            );
          })}</div>
        </>}
    </section>
  );
}
