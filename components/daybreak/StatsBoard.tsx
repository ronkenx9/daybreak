'use client';
import { useQuery } from '@tanstack/react-query';
import DaybreakTokenPanel from './DaybreakTokenPanel';

interface Stats { configured: boolean; accounts?: number | null; launches?: number | null; creations?: number | null; circles?: number | null; members?: number | null; messages?: number | null; communityTokens?: number | null; wallets?: number | null }

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

// The stats content only — no page chrome. Shared by the /stats page and the
// in-app Stats tab.
export default function StatsBoard({ address }: { address?: string }) {
  const q = useQuery({ queryKey: ['site-stats'], queryFn: async ({ signal }) => {
    const r = await fetch('/api/stats', { signal, cache: 'no-store' });
    return r.json() as Promise<Stats>;
  }, staleTime: 60_000, refetchInterval: 120_000 });
  const d = q.data;

  return <>
    <div className="db-stat-grid">
      {TILES.map((t) => (
        <div className="db-stat-tile" key={t.key}>
          <strong className="db-shine">{(() => { const v = d?.[t.key]; return q.isPending || v == null || typeof v !== 'number' ? '—' : v.toLocaleString('en-US'); })()}</strong>
          <span>{t.label}</span>
          <small>{t.hint}</small>
        </div>
      ))}
    </div>
    {d && d.configured === false && <p className="db-small-note">Live counts connect once the database is configured.</p>}

    <div className="db-section-heading db-dayc-heading"><div><span className="db-eyebrow">Daybreak token · live on Base</span><h2>Own a piece of Daybreak.</h2></div></div>
    <DaybreakTokenPanel address={address} />

    <p className="db-small-note" style={{ marginTop: 24 }}>Counts update every minute. Token market data from DexScreener. Figures are activity metrics, not investment performance.</p>
  </>;
}
