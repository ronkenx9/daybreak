'use client';
import { useQuery } from '@tanstack/react-query';
import { Radio } from 'lucide-react';
import { tokenForTicker } from '@/lib/base/tokens';

export interface NewsStory { ticker: string; title: string; url: string; source: string; seenAt: string; image: string }

// Always-on headline ticker. Each item opens that stock's workspace — the news →
// stock → paired-memecoin flywheel. Real GDELT headlines; hides itself if empty.
export default function NewsTicker({ onOpenStory }: { onOpenStory: (story: NewsStory) => void }) {
  const q = useQuery({
    queryKey: ['news-feed'],
    queryFn: async ({ signal }) => {
      const r = await fetch('/api/news/feed', { signal });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'News feed unavailable');
      return d as { items: NewsStory[]; stale?: boolean };
    },
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: 1,
  });

  const items = q.data?.items ?? [];
  if (items.length === 0) return null; // no empty bar — the flywheel appears only with real news

  // Duplicate the run so the marquee loops seamlessly.
  const run = [...items, ...items];
  return (
    <div className="db-ticker" aria-label="Live market news">
      <span className="db-ticker-badge"><Radio size={13} /> Live news</span>
      <div className="db-ticker-viewport">
        <div className="db-ticker-track">
          {run.map((it, i) => {
            const known = !!tokenForTicker(it.ticker);
            return (
              <button key={it.url + i} className="db-ticker-item" title={`${it.title} — ${it.source}`}
                onClick={() => known && onOpenStory(it)} tabIndex={i < items.length ? 0 : -1} aria-hidden={i >= items.length}>
                <b>{it.ticker}</b>
                <span className="db-ticker-title">{it.title}</span>
                <span className="db-ticker-src">{it.source}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
