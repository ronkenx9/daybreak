'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ExternalLink, ImageIcon, MessageCircle } from 'lucide-react';
import MemeChart from './MemeChart';
import NewsDiscussion from './NewsDiscussion';
import type { NewsStory } from './NewsTicker';

interface Article { title: string; url: string; source: string; seenAt: string; image: string }
interface Feed { ticker: string; articles: Article[]; checkedAt: number }

export default function CompanyNews({ ticker, token, initialStory = null }: { ticker: string; token: string; initialStory?: NewsStory | null }) {
  const [selected, setSelected] = useState<Article | null>(initialStory);
  useEffect(() => { setSelected(initialStory); }, [ticker, initialStory]);
  const q = useQuery({ queryKey: ['news', ticker], queryFn: async ({ signal }) => { const r = await fetch(`/api/news?ticker=${encodeURIComponent(ticker)}`, { signal }); const d = await r.json(); if (!r.ok) throw Error(d.error); return d as Feed; }, staleTime: 15 * 60_000, retry: false });
  useEffect(() => { if (!selected && q.data?.articles[0]) setSelected(q.data.articles[0]); }, [q.data, selected]);
  const articles = useMemo(() => initialStory && !q.data?.articles.some((article) => article.url === initialStory.url) ? [initialStory, ...(q.data?.articles ?? [])] : q.data?.articles ?? [], [initialStory, q.data]);
  const preview = useQuery({ queryKey: ['news-preview', selected?.url], enabled: !!selected, queryFn: async ({ signal }) => { const response = await fetch('/api/news/preview', { method: 'POST', signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ticker, url: selected!.url }) }); const data = await response.json(); if (!response.ok) throw Error(data.error || 'Preview unavailable'); return data as { summary: string; image: string }; }, retry: false, staleTime: 60 * 60_000 });
  const image = preview.data?.image || selected?.image || '';

  return <section className={`db-news${selected ? ' has-story' : ''}`} aria-label={`${ticker} company news`}>
    <div className="db-section-heading"><div><span className="db-eyebrow">News and market context</span><h3>{selected ? 'The story, the chart, the conversation.' : 'Company news'}</h3></div><button className="db-text-link" disabled={q.isFetching} onClick={() => void q.refetch()}>{q.isFetching ? 'Loading…' : 'Refresh'}</button></div>
    {selected ? <>
      <div className="db-news-focus">
        <article className="db-news-story">
          <div className="db-news-image">{image ? <img src={image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }}/> : <ImageIcon size={30}/>}</div>
          <div className="db-news-story-copy"><span>{selected.source}{selected.seenAt ? ` · ${new Date(selected.seenAt).toLocaleDateString()}` : ''}</span><h4>{selected.title}</h4><div className="db-news-summary"><strong>Summary</strong>{preview.isPending ? <p>Reading the publisher’s preview…</p> : <p>{preview.data?.summary || selected.title}</p>}</div><a className="db-text-link" href={selected.url} target="_blank" rel="noopener noreferrer">Read full article <ExternalLink size={15}/></a></div>
        </article>
        <section className="db-news-market" aria-label={`${ticker} market response`}><div><span className="db-eyebrow">Market response</span><p>Price around the report</p></div><MemeChart token={token} eventTime={selected.seenAt}/><small>The news marker shows publication time on available pool data. Timing alone does not prove the story caused the move.</small></section>
      </div>
      <NewsDiscussion ticker={ticker} url={selected.url}/>
    </> : <MemeChart token={token}/>}
    {q.isPending && <p role="status">Finding recent coverage…</p>}{q.isError && <p role="status">{selected ? 'More company news is temporarily unavailable.' : 'News is temporarily unavailable.'}{q.data ? ' Previously loaded articles are below.' : ''}</p>}
    {articles.length === 0 && q.data && <p>No matching coverage found in the past week.</p>}
    {articles.length > 0 && <div className="db-news-rail" aria-label="Latest articles">{articles.map((article) => <button key={article.url} aria-pressed={selected?.url === article.url} onClick={() => setSelected(article)}><span>{article.source}</span><strong>{article.title}</strong><small>{article.seenAt ? new Date(article.seenAt).toLocaleDateString() : 'Recent'}</small><ArrowRight size={16}/></button>)}</div>}
    <p className="db-small-note"><MessageCircle size={14}/> News opens inside Daybreak so the article, market context and discussion stay together. Article discovery by <a href="https://www.gdeltproject.org/" target="_blank" rel="noreferrer">GDELT</a>.</p>
  </section>;
}
