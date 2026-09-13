'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from './Identity';
import MotionBackground from './MotionBackground';
import DaybreakTokenPanel from './DaybreakTokenPanel';

interface Stats { configured: boolean; accounts?: number; launches?: number; creations?: number; circles?: number; members?: number; messages?: number; communityTokens?: number; wallets?: number }

const TILES: { key: keyof Stats; label: string; hint: string }[] = [
  { key: 'accounts', label: 'Accounts created', hint: 'People who signed up' },
  { key: 'launches', label: 'Tokens launched', hint: 'Deployed on Base' },
  { key: 'creations', label: 'Muse creations', hint: 'Art forged in-app' },
  { key: 'circles', label: 'Circles', hint: 'Communities formed' },
  { key: 'members', label: 'Circle members', hint: 'Active memberships' },
  { key: 'messages', label: 'Circle messages', hint: 'Shared in chat' },
  { key: 'communityTokens', label: 'Community tokens', hint: 'Live on Base' },
  { key: 'wallets', label: 'Wallets linked', hint: 'Verified owners' },
];

export default function StatsDashboard() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const m = matchMedia('(prefers-color-scheme: dark)');
    const on = () => setDark(m.matches); on();
    m.addEventListener('change', on); return () => m.removeEventListener('change', on);
  }, []);
  const q = useQuery({ queryKey: ['site-stats'], queryFn: async ({ signal }) => {
    const r = await fetch('/api/stats', { signal, cache: 'no-store' });
    return r.json() as Promise<Stats>;
  }, staleTime: 60_000, refetchInterval: 120_000 });
  const d = q.data;

  return (
    <div className="db-app" data-theme={dark ? 'dark' : undefined}>
      <MotionBackground dark={dark} reduced={false} />
      <header className="db-app-header">
        <Wordmark />
        <Link href="/app" className="db-text-link"><ArrowLeft size={16} /> Back to app</Link>
      </header>
      <main className="db-app-content">
        <div className="db-app-title"><div>
          <span className="db-eyebrow">Live · Daybreak on Base</span>
          <h1>Daybreak by the numbers.</h1>
        </div></div>

        <div className="db-stat-grid">
          {TILES.map((t) => (
            <div className="db-stat-tile" key={t.key}>
              <strong className="db-shine">{q.isPending ? '—' : (Number(d?.[t.key] ?? 0)).toLocaleString('en-US')}</strong>
              <span>{t.label}</span>
              <small>{t.hint}</small>
            </div>
          ))}
        </div>
        {d && d.configured === false && <p className="db-small-note">Live counts connect once the database is configured.</p>}

        <div className="db-section-heading"><div><span className="db-eyebrow">Daybreak token · live on Base</span><h2>Own a piece of Daybreak.</h2></div></div>
        <DaybreakTokenPanel />

        <p className="db-small-note" style={{ marginTop: 24 }}>Counts update every minute. Token market data from DexScreener. Figures are activity metrics, not investment performance.</p>
      </main>
    </div>
  );
}
