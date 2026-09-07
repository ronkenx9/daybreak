'use client';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Droplets } from 'lucide-react';
import { StockIcon } from './Identity';
import { STOCK_LP_MARKETS } from '@/lib/base/lp-model';
import { tokenForTicker, type StockToken } from '@/lib/base/tokens';

interface PoolSnapshot { reserveUsd: number | null; volume24Usd: number | null; feeBps: number }
const money = (value: number | null | undefined) => value == null ? 'Unavailable' : value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// One LP-eligible stock. The parent fetches the pool summary once, so opening
// the Earn grid does not turn into ten parallel GeckoTerminal requests.
function EarnCard({ token, pool, loading, failed, onOpen }: { token: StockToken; pool?: PoolSnapshot & { dataStatus?: 'live' | 'unavailable' }; loading: boolean; failed: boolean; onOpen: (t: StockToken) => void }) {
  const liquidity = loading ? 'Loading…' : failed || pool?.dataStatus === 'unavailable' ? 'Unavailable' : money(pool?.reserveUsd);
  return <article className="db-company-card db-earn-card">
    <div className="db-card-top"><StockIcon ticker={token.ticker} /><span className="db-earn-chip"><Droplets size={13} /> LP · Base</span></div>
    <button className="db-company-open" onClick={() => onOpen(token)}>
      <span className="db-ticker">{token.ticker}</span>
      <h3>{token.name}</h3>
      <span className="db-earn-stats">
        <span><small>Pool liquidity</small><strong>{liquidity}</strong></span>
        <span><small>Pool fee</small><strong>{(STOCK_LP_MARKETS[token.ticker]?.feeBps ?? 0) / 100}%</strong></span>
      </span>
      <span className="db-card-bottom">Provide liquidity <ArrowUpRight size={18} /></span>
    </button>
  </article>;
}

// Top-level Earn tab: the stocks with a supported Aerodrome LP route.
export default function EarnFeed({ onOpen }: { onOpen: (t: StockToken) => void }) {
  const tokens = Object.keys(STOCK_LP_MARKETS).map((t) => tokenForTicker(t)).filter((t): t is StockToken => !!t);
  const summary = useQuery({
    queryKey: ['stock-lp-summary'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/lp/summary', { signal, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'LP summary unavailable');
      return data.pools as Array<PoolSnapshot & { ticker: string; dataStatus: 'live' | 'unavailable' }>;
    },
    staleTime: 60_000,
    retry: 1,
  });
  const pools = new Map((summary.data ?? []).map((pool) => [pool.ticker, pool]));
  return <>
    <p className="db-small-note">Pair a tokenized stock with USDC on Aerodrome and earn trading fees or AERO emissions while your position stays in range. You provide and sign from your own wallet inside Daybreak.</p>
    <div className="db-stock-grid" data-reveal>{tokens.map((t) => <EarnCard key={t.ticker} token={t} pool={pools.get(t.ticker)} loading={summary.isPending} failed={summary.isError} onOpen={onOpen} />)}</div>
  </>;
}
