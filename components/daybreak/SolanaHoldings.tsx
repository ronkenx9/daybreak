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
  if (!account.authenticated) return null;
  const rows = q.data?.holdings ?? [];

  return (
    <section className="db-portfolio" aria-label="Solana xStocks holdings">
      <div className="db-section-heading"><h2>Tokenized stocks on Solana</h2><span className="db-small-note">xStocks · Token-2022</span></div>
      {!address ? <p className="db-small-note">Your Solana wallet is loading…</p>
        : q.isPending ? <p className="db-small-note">Reading balances on Solana…</p>
        : q.isError ? <p className="db-small-note">Solana balances are unavailable right now.</p>
        : rows.length === 0 ? <p className="db-small-note">No xStocks found in your Solana wallet yet.</p>
        : <div className="db-holdings-list">{rows.map((h) => (
            <div className="db-holding-row" key={h.mint}>
              <StockIcon ticker={h.ticker} size={44} />
              <div className="db-holding-main"><strong>{h.company}</strong><small>{h.xSymbol}</small></div>
              <div className="db-holding-val"><strong className="db-shine">{h.quantity}</strong><small>shares</small></div>
            </div>
          ))}</div>}
    </section>
  );
}
