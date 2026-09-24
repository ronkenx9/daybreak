'use client';
import { useQuery } from '@tanstack/react-query';
import { useAccountState } from './AccountProvider';

interface Holding { symbol: string; company: string; mint: string; decimals: number; rawAmount: string; quantity: string }
interface Snap { address: string; chain: string; slot: number; holdings: Holding[] }
interface Quote { symbol: string; company: string; mint: string; image: string; tokenPrice: number | null }

const usd = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// PreStocks (pre-IPO, Token-2022) balances held in the account's Solana wallet,
// valued with the live PreStocks token price. Mirrors XStocksHoldings.
export default function PreStocksHoldings() {
  const account = useAccountState();
  const address = account.solanaWallet || undefined;
  const q = useQuery({
    queryKey: ['prestock-holdings', address],
    enabled: !!address,
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/prestocks/holdings?address=${address}`, { signal, cache: 'no-store' });
      if (!r.ok) throw new Error('unavailable');
      return r.json() as Promise<Snap>;
    },
    staleTime: 20_000, refetchInterval: 60_000, retry: 1,
  });
  const prices = useQuery({
    queryKey: ['prestocks'],
    queryFn: async ({ signal }) => {
      const r = await fetch('/api/prestocks', { signal });
      return r.json() as Promise<{ items: Quote[] }>;
    },
    staleTime: 30_000, refetchInterval: 60_000, retry: 1,
  });
  if (!account.authenticated) return null;
  const rows = q.data?.holdings ?? [];
  if (!address || (!q.isPending && rows.length === 0)) return null; // stay quiet unless there's something to show

  const priceOf = (sym: string) => prices.data?.items?.find((x) => x.symbol === sym)?.tokenPrice ?? null;
  const imageOf = (sym: string) => prices.data?.items?.find((x) => x.symbol === sym)?.image ?? '';
  let total = 0; let priced = 0;
  for (const h of rows) { const p = priceOf(h.symbol); if (p != null) { total += parseFloat(h.quantity.replace(/,/g, '')) * p; priced++; } }

  return (
    <section className="db-portfolio" aria-label="Pre-IPO holdings on Solana">
      <div className="db-section-heading"><h2>Pre-IPO stocks on Solana</h2><span className="db-small-note">PreStocks · Token-2022</span></div>
      {q.isPending ? <p className="db-small-note">Reading balances on Solana…</p>
        : <>
          {priced > 0 && <div className="db-portfolio-value"><span>Reference value</span><h2 className="db-shine">{usd(total)}</h2></div>}
          <div className="db-holdings-list">{rows.map((h) => {
            const p = priceOf(h.symbol);
            const value = p != null ? parseFloat(h.quantity.replace(/,/g, '')) * p : null;
            const img = imageOf(h.symbol);
            return (
              <div className="db-holding-row" key={h.mint}>
                {img ? <img className="db-prestock-logo" src={img} alt="" width={44} height={44} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <div className="db-prestock-logo" />}
                <div className="db-holding-main"><strong>{h.company}</strong><small>{h.quantity} {h.symbol}</small></div>
                <div className="db-holding-val"><strong className="db-shine">{value != null ? usd(value) : h.quantity}</strong><small>{value != null ? 'token price' : 'tokens'}</small></div>
              </div>
            );
          })}</div>
        </>}
      <p className="db-small-note">Backed 1:1 by SPV exposure; no ownership or voting rights. Reference value only.</p>
    </section>
  );
}
