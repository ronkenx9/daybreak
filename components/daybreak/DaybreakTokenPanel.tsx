'use client';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import MemeChart from './MemeChart';
import { DAYBREAK_TOKEN } from '@/lib/base/daybreak-token';

interface Resp {
  priceUsd: number | null; change24: number | null; liquidityUsd: number | null;
  volume24: number | null; marketCapUsd: number | null; balance: string | null; balanceUsd: number | null;
}

const money = (n: number | null, big = false) => n == null ? '—'
  : big ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  : n >= 1 ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  : '$' + n.toLocaleString('en-US', { maximumSignificantDigits: 2, minimumSignificantDigits: 2 });

export default function DaybreakTokenPanel({ address }: { address?: string }) {
  const q = useQuery({
    queryKey: ['daybreak-token', address?.toLowerCase() ?? null],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/daybreak-token${address ? `?address=${address}` : ''}`, { signal, cache: 'no-store' });
      if (!r.ok) throw new Error('unavailable');
      return r.json() as Promise<Resp>;
    },
    staleTime: 30_000, refetchInterval: 60_000, retry: 1,
  });
  const d = q.data;
  const up = (d?.change24 ?? 0) >= 0;

  return (
    <section className="db-dayc" aria-label="Daybreak token">
      <div className="db-dayc-head">
        <div className="db-dayc-id">
          <span className="db-dayc-mark" aria-hidden="true"><img src="/assets/daybreak-icon-v2.svg" alt="" width="30" height="30" /></span>
          <div>
            <strong>Daybreak</strong>
            <small>DAYC · Base</small>
          </div>
        </div>
        <div className="db-dayc-price">
          <strong className="db-shine">{money(d?.priceUsd ?? null)}</strong>
          {d?.change24 != null && <span className={up ? 'db-dayc-up' : 'db-dayc-down'}>{up ? '▲' : '▼'} {Math.abs(d.change24).toFixed(2)}%</span>}
        </div>
      </div>

      {d?.balance && d.balance !== '0' && (
        <div className="db-dayc-balance"><span>You hold</span><strong>{d.balance} DAYC</strong>{d.balanceUsd != null && <em>{money(d.balanceUsd)}</em>}</div>
      )}

      <MemeChart token={DAYBREAK_TOKEN.address} up={up} />

      <div className="db-dayc-stats">
        <div><span>24h volume</span><strong>{money(d?.volume24 ?? null, true)}</strong></div>
        <div><span>Liquidity</span><strong>{money(d?.liquidityUsd ?? null, true)}</strong></div>
        <div><span>Market cap</span><strong>{money(d?.marketCapUsd ?? null, true)}</strong></div>
      </div>

      <div className="db-dayc-actions">
        <a className="db-button db-blue-button" href={DAYBREAK_TOKEN.buyUrl} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={16} /> Buy DAYC on Base</a>
        <a className="db-text-link" href={DAYBREAK_TOKEN.scanUrl} target="_blank" rel="noopener noreferrer">Contract <ExternalLink size={14} /></a>
      </div>
    </section>
  );
}
