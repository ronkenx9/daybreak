'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { isXstockTicker } from '@/lib/solana/xstock-tickers';

interface Quote { ticker: string; xSymbol: string; usdcIn: number; sharesOut: number; minSharesOut: number; priceImpactPct: number | null; slippageBps: number; hops: number }

// Read-only Jupiter quote for buying an xStock with USDC on Solana. Execution
// (build + sign in your Solana wallet + send) is a separate step; this never moves funds.
export default function SolanaSwapQuote({ ticker }: { ticker: string }) {
  const [amount, setAmount] = useState('10');
  const usdc = Number(amount);
  const supported = isXstockTicker(ticker); // only for tickers with a Solana xStock
  const q = useQuery({
    queryKey: ['sol-swap-quote', ticker, amount],
    enabled: supported && usdc > 0,
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/solana/swap-quote?ticker=${ticker}&usdc=${usdc}`, { signal });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'No route');
      return d as Quote;
    },
    staleTime: 15_000, retry: 0,
  });
  if (!supported) return null;

  return (
    <section className="db-swapq">
      <div className="db-section-heading"><h3>Buy on Solana</h3><span className="db-small-note">xStocks · Jupiter</span></div>
      <label className="db-swapq-amount"><span>You pay</span>
        <span><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, '').slice(0, 9))} aria-label="USDC amount" /><b>USDC</b></span>
      </label>
      {q.isPending && usdc > 0 && <p className="db-small-note">Finding the best route…</p>}
      {q.isError && <p className="db-small-note">{q.error instanceof Error ? q.error.message : 'No route available'}</p>}
      {q.data && (
        <div className="db-swapq-out">
          <div className="db-swapq-route"><span>{q.data.usdcIn} USDC</span><ArrowRight size={15} /><strong>{q.data.sharesOut.toLocaleString('en-US', { maximumFractionDigits: 6 })} {q.data.xSymbol}</strong></div>
          <dl>
            <div><dt>Minimum received</dt><dd>{q.data.minSharesOut.toLocaleString('en-US', { maximumFractionDigits: 6 })} {q.data.xSymbol}</dd></div>
            <div><dt>Price impact</dt><dd>{q.data.priceImpactPct != null ? `${(q.data.priceImpactPct * 100).toFixed(3)}%` : '—'}</dd></div>
            <div><dt>Slippage</dt><dd>{q.data.slippageBps / 100}%</dd></div>
            <div><dt>Route</dt><dd>Jupiter · {q.data.hops} hop{q.data.hops === 1 ? '' : 's'}</dd></div>
          </dl>
        </div>
      )}
      <p className="db-small-note">Live Jupiter quote. Execution is signed in your own Solana wallet as a separate, explicit step — Daybreak never moves your funds. Eligible jurisdictions only; a quote is not a reserved price.</p>
    </section>
  );
}
