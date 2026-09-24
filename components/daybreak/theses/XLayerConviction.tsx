'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Lock, TrendingDown, TrendingUp } from 'lucide-react';
import { StockIcon } from '../Identity';
import { XLAYER_VAULT_ADDRESS, type VaultThesis } from '@/lib/xlayer/vault';

// Theses backed with real xStocks in the DaybreakConvictionVault on X Layer mainnet.
const fmt = (v: string) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 4 });
const left = (ts: number) => { const s = ts - Date.now() / 1000; if (s <= 0) return 'Ended'; const d = Math.floor(s / 86400); return d >= 1 ? `${d}d left` : `${Math.ceil(s / 3600)}h left`; };

export default function XLayerConviction() {
  const q = useQuery({
    queryKey: ['xlayer-theses', 'hub'], staleTime: 20_000, refetchInterval: 60_000, retry: 1,
    queryFn: async ({ signal }) => { const r = await fetch('/api/xlayer/theses', { signal, cache: 'no-store' }); if (!r.ok) throw new Error('unavailable'); return r.json() as Promise<{ theses: VaultThesis[] }>; },
  });
  const theses = q.data?.theses ?? [];
  return <section className="db-xlayer-conviction" aria-labelledby="xlayer-conviction-title">
    <div className="db-section-heading"><div><span className="db-eyebrow">On X Layer · real stock</span><h3 id="xlayer-conviction-title">Conviction you can prove</h3></div>
      <a className="db-text-link" href={`https://www.oklink.com/xlayer/address/${XLAYER_VAULT_ADDRESS}`} target="_blank" rel="noreferrer">Vault contract <ArrowUpRight size={13}/></a></div>
    <p className="db-small-note"><Lock size={12}/> Backers lock real xStocks behind a thesis until it ends, then get exactly that stock back. No payouts, no admin keys.</p>
    {q.isPending ? <p className="db-small-note">Reading the vault on X Layer…</p>
      : q.isError ? <p className="db-small-note">X Layer theses are unavailable right now.</p>
      : theses.length === 0 ? <p className="db-small-note">No theses yet. Open a stock, choose the X Layer card and publish the first one.</p>
      : <div className="db-holdings-list">{theses.map((t) => <Link key={t.id} href={`/app?stock=${t.ticker ?? ''}`} className="db-holding-row db-xlayer-thesis">
          {t.ticker && <StockIcon ticker={t.ticker} size={40}/>}
          <div className="db-holding-main"><strong>{t.bullish ? <TrendingUp size={13}/> : <TrendingDown size={13}/>} {t.ticker ?? 'Stock'} · {t.statement}</strong><small>{fmt(t.lockedStock)} {t.symbol} locked · {t.backers} backer{t.backers === 1 ? '' : 's'} · {left(t.expiresAt)}</small></div>
          <div className="db-holding-val"><small>{t.expired ? 'Ended' : 'Back it'}</small></div>
        </Link>)}</div>}
  </section>;
}
