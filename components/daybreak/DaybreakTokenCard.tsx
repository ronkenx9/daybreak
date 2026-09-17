'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import Dialog from './Dialog';
import DaybreakTokenPanel from './DaybreakTokenPanel';
import Sparkline from './Sparkline';
import { DAYBREAK_TOKEN } from '@/lib/base/daybreak-token';

interface Resp { priceUsd: number | null; change24: number | null; marketCapUsd: number | null }
const money = (n: number | null) => n == null ? '—' : n >= 1 ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '$' + n.toLocaleString('en-US', { maximumSignificantDigits: 2, minimumSignificantDigits: 2 });
const compact = (n: number | null) => n == null ? '—' : n >= 1e9 ? '$' + (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(0) + 'K' : '$' + Math.round(n);

// Compact DAYC card that sits inline beside the stock cards, labelled "Platform
// token". Clicking opens the full token panel (chart + buy) in a dialog, so the
// homepage isn't dominated by a big chart up top.
export default function DaybreakTokenCard({ address }: { address?: string }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ['daybreak-token-card'],
    queryFn: async ({ signal }) => {
      const r = await fetch('/api/daybreak-token', { signal });
      if (!r.ok) throw new Error('unavailable');
      return r.json() as Promise<Resp>;
    },
    staleTime: 30_000, refetchInterval: 60_000, retry: 1,
  });
  const d = q.data;
  const up = (d?.change24 ?? 0) >= 0;

  return (
    <>
      <button className="db-meme-card db-stock-card db-dayc-card" onClick={() => setOpen(true)}>
        <div className="db-meme-card-art db-stock-card-art db-dayc-card-art">
          <img src="/assets/daybreak-icon-v2.svg" alt="" width={64} height={64} />
          <span className="db-dayc-card-tag">Platform token</span>
          <div className="db-meme-card-badge db-stock-card-badge">
            <div><span>PRICE</span><strong>{money(d?.priceUsd ?? null)}</strong></div>
            {d?.change24 != null && <div><span>24H</span><strong className={up ? 'up' : 'down'}>{up ? '+' : ''}{d.change24.toFixed(1)}%</strong></div>}
          </div>
        </div>
        <div className="db-meme-card-body">
          <div className="db-meme-card-title"><strong>DAYC</strong><span>Daybreak</span></div>
          <div className="db-meme-card-spark"><span>24h</span><Sparkline token={DAYBREAK_TOKEN.address} up={up} /></div>
          <div className="db-meme-card-stats db-stock-card-stats">
            <div><b>{compact(d?.marketCapUsd ?? null)}</b><span>MARKET CAP</span></div>
            <div><b>Base</b><span>NETWORK</span></div>
          </div>
        </div>
      </button>
      {open && <Dialog wide label="Daybreak token" onClose={() => setOpen(false)}>
        <div className="db-dialog-top"><span className="db-small-note">Platform token · Base</span><button aria-label="Close" className="db-icon-button" onClick={() => setOpen(false)}><X size={20} /></button></div>
        <DaybreakTokenPanel address={address} />
      </Dialog>}
    </>
  );
}
