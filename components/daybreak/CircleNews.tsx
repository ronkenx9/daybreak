'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import type { NewsStory } from './NewsTicker';
import NewsDiscussion from './NewsDiscussion';
import { TOKENS } from '@/lib/base/tokens';

// A circle's view of the news: the same global feed, filtered to the circle's
// tickers. Threads follow the story: NewsDiscussion keys by ticker + URL, so the
// same article under the same ticker is one shared thread (ticker dialog, circle
// strip, create chips). An article filed under two tickers keeps one thread per
// ticker — each community's conversation stays its own.
export default function CircleNews({ tickers, title }: { tickers: string[]; title?: string }) {
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['news-feed'],
    queryFn: async ({ signal }) => {
      const r = await fetch('/api/news/feed', { signal });
      const d = await r.json(); if (!r.ok) throw new Error('news');
      return d as { items: NewsStory[] };
    },
    staleTime: 5 * 60_000, retry: 1,
  });
  const items = (q.data?.items ?? []).filter((i) => tickers.includes(i.ticker)).slice(0, 6);
  const open = items.find((i) => i.url === openUrl) ?? null;
  return <div className="db-create-news">
    <span className="db-eyebrow">{title ?? 'For this circle'}</span>
    {open ? <div>
      <button type="button" className="db-text-link" onClick={() => setOpenUrl(null)}><ArrowLeft size={15}/> All circle stories</button>
      <p className="db-small-note"><strong>{open.ticker}</strong> · {open.title} <span>({open.source})</span></p>
      <NewsDiscussion ticker={open.ticker} url={open.url} />
    </div> : q.isPending ? <p className="db-small-note">Loading circle stories…</p>
    : q.isError ? <p className="db-small-note" role="status">Stories are unavailable right now — the circle feed will catch up.</p>
    : items.length > 0 ? <div className="db-create-news-row">{items.map((n) => TOKENS.some((t) => t.ticker === n.ticker)
      ? <button type="button" key={n.url} onClick={() => setOpenUrl(n.url)}><strong>{n.ticker}</strong><span>{n.title}</span><small><MessageCircle size={12}/> Discuss</small></button>
      : <span key={n.url} className="db-create-news-plain"><strong>{n.ticker}</strong><span>{n.title}</span></span>)}</div>
    : <p className="db-small-note">No fresh stories for these stocks yet.</p>}
  </div>;
}
