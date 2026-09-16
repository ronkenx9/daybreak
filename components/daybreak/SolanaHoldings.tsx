'use client';
import { useQuery } from '@tanstack/react-query';
import { StockIcon } from './Identity';
import { useAccountState } from './AccountProvider';

interface SolHolding { ticker: string; company: string; xSymbol: string; mint: string; decimals: number; rawAmount: string; quantity: string }
interface Snap { address: string; chain: string; slot: number; holdings: SolHolding[] }

export default function SolanaHoldings() {
  const account = useAccountState();
  const address = account.solanaWallet || undefined;
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
  const rows = q.data?.holdings ?? [];
  const tickers = rows.map((h) => h.ticker);
  const prices = useQuery({
    queryKey: ['equity-prices', tickers.join(',')],
    enabled: tickers.length > 0,
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/equity-prices?tickers=${tickers.join(',')}`, { signal });
      return r.json() as Promise<{ prices: Record<string, { priceUsd: number | null; source: string; stale: boolean }> }>;
    },
    staleTime: 20_000, refetchInterval: 60_000, retry: 1,
  });
  if (!account.authenticated) return null;

  const usd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const priceOf = (t: string) => prices.data?.prices?.[t];
  let total = 0; let priced = 0;
  for (const h of rows) { const p = priceOf(h.ticker); if (p?.priceUsd != null) { total += parseFloat(h.quantity.replace(/,/g, '')) * p.priceUsd; priced++; } }

  return (
    <section className="db-portfolio" aria-label="Solana xStocks holdings">
      <div className="db-section-heading"><h2>Tokenized stocks on Solana</h2><span className="db-small-note">xStocks · Token-2022</span></div>
      {!address ? <p className="db-small-note">Your Solana wallet is loading…</p>
        : q.isPending ? <p className="db-small-note">Reading balances on Solana…</p>
        : q.isError ? <p className="db-small-note">Solana balances are unavailable right now.</p>
        : rows.length === 0 ? <p className="db-small-note">No xStocks found in your Solana wallet yet.</p>
        : <>
          {priced > 0 && <div className="db-portfolio-value"><span>Reference value</span><h2 className="db-shine">{usd(total)}</h2></div>}
          <div className="db-holdings-list">{rows.map((h) => {
            const p = priceOf(h.ticker);
            const value = p?.priceUsd != null ? parseFloat(h.quantity.replace(/,/g, '')) * p.priceUsd : null;
            return (
              <div className="db-holding-row" key={h.mint}>
                <StockIcon ticker={h.ticker} size={44} />
                <div className="db-holding-main"><strong>{h.company}</strong><small>{h.quantity} {h.xSymbol}</small></div>
                <div className="db-holding-val"><strong className="db-shine">{value != null ? usd(value) : h.quantity}</strong><small>{value != null ? (p!.stale ? 'reference' : 'live') : 'shares'}</small></div>
              </div>
            );
          })}</div>
        </>}
    </section>
  );
}
