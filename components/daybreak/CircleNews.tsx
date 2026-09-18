'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import type { NewsStory } from './NewsTicker';
import NewsDiscussion from './NewsDiscussion';
import { isPreStockSymbol } from '@/lib/solana/prestocks-symbols';

// The server resolves the circle's configured tickers and returns a balanced,
// access-checked feed. Discussions include the circle slug in article identity,
// so each community keeps its own conversation around the same public story.
export default function CircleNews({ slug, isMember, title, initialStoryUrl }: { slug: string; isMember: boolean; title?: string; initialStoryUrl?: string }) {
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['circle-news', slug],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/circles/news?slug=${encodeURIComponent(slug)}`, { signal });
      const d = await r.json(); if (!r.ok) throw new Error('news');
      return d as { items: NewsStory[]; stale: boolean; coverage: { companies: number; available: number; unavailable: string[] } };
    },
    staleTime: 5 * 60_000, retry: 1,
  });
  const items = q.data?.items ?? [];
  useEffect(() => {
    if (initialStoryUrl && items.some((item) => item.url === initialStoryUrl)) setOpenUrl(initialStoryUrl);
  }, [initialStoryUrl, items]);
  const open = items.find((i) => i.url === openUrl) ?? null;
  return <div className="db-create-news">
    <span className="db-eyebrow">{title ?? 'For this circle'}</span>
    {open ? <div>
      <button type="button" className="db-text-link" onClick={() => setOpenUrl(null)}><ArrowLeft size={15}/> All circle stories</button>
      <p className="db-small-note"><strong>{isPreStockSymbol(open.ticker) ? `Pre-IPO · ${open.ticker}` : open.ticker}</strong> · {open.title} <span>({open.source})</span></p>
      <NewsDiscussion ticker={open.ticker} url={open.url} circleSlug={slug} isMember={isMember} />
    </div> : q.isPending ? <p className="db-small-note">Loading circle stories…</p>
    : q.isError ? <p className="db-small-note" role="status">Stories are unavailable right now — the circle feed will catch up.</p>
    : items.length > 0 ? <><div className="db-create-news-row">{items.map((n) => <button type="button" key={`${n.ticker}-${n.url}`} onClick={() => setOpenUrl(n.url)}><strong>{isPreStockSymbol(n.ticker) ? `Pre-IPO · ${n.ticker}` : n.ticker}</strong><span>{n.title}</span><small><MessageCircle size={12}/> Discuss</small></button>)}</div>{q.data?.coverage.unavailable.length ? <p className="db-small-note" role="status">Showing available stories. Updates for {q.data.coverage.unavailable.join(', ')} could not be refreshed.</p> : null}</>
    : <p className="db-small-note">No fresh stories for these companies yet.</p>}
  </div>;
}
