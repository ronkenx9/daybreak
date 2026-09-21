'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bookmark, Newspaper, Sparkles } from 'lucide-react';
import { StockIcon } from './Identity';
import { tokenForTicker } from '@/lib/base/tokens';
import { COMPANY_BY_ID } from '@/lib/assets/companies';
import { thesisCompanyId } from '@/lib/theses/company-journey';
import type { NewsStory } from './NewsTicker';
import type { ThesisView } from './theses/types';

type ActivityItem = { id: string; ticker: string; title: string; detail: string; time: string; href: string; kind: 'news' | 'thesis'; source: string };

export default function CompanyActivity({ saved }: { saved: string[] }) {
  const followed = saved.filter(ticker => !!tokenForTicker(ticker));
  const feed = useQuery({
    queryKey: ['company-activity', followed.join(',')],
    queryFn: async ({ signal }) => {
      const [newsResponse, thesisResponse] = await Promise.all([
        fetch('/api/news/feed', { signal }),
        fetch('/api/theses?mode=all&page=0', { signal }),
      ]);
      if (!newsResponse.ok && !thesisResponse.ok) throw new Error('Activity unavailable');
      const news: NewsStory[] = newsResponse.ok ? ((await newsResponse.json()) as { items: NewsStory[] }).items ?? [] : [];
      const theses: ThesisView[] = thesisResponse.ok ? ((await thesisResponse.json()) as { items: ThesisView[] }).items ?? [] : [];
      return { news, theses, partial: !newsResponse.ok || !thesisResponse.ok };
    },
    staleTime: 60_000,
    retry: false,
  });
  const watching = new Set(followed);
  const newsItems: ActivityItem[] = (feed.data?.news ?? []).filter(item => !followed.length || watching.has(item.ticker)).map(item => ({
    id: `news:${item.url}`, ticker: item.ticker, title: item.title, detail: 'Read the story, chart and discussion',
    time: item.seenAt, href: `/app?${new URLSearchParams({ stock: item.ticker, story: item.url, headline: item.title, source: item.source, seen: item.seenAt })}`, kind: 'news', source: item.source,
  }));
  const thesisItems: ActivityItem[] = (feed.data?.theses ?? []).filter(item => !followed.length || followed.some(ticker => thesisCompanyId(ticker) === item.companyId)).map(item => ({
    id: `thesis:${item.id}`, ticker: COMPANY_BY_ID[item.companyId]?.symbol ?? '', title: item.title, detail: item.summary, time: item.publishedAt ?? '', href: `/theses/${item.slug}`, kind: 'thesis', source: item.mode === 'paper' ? 'Public paper thesis' : 'Live thesis',
  }));
  const items = [...newsItems, ...thesisItems].sort((a, b) => Date.parse(b.time || '1970-01-01') - Date.parse(a.time || '1970-01-01')).slice(0, 20);

  return <section className="db-activity">
    <header className="db-activity-head"><div><span className="db-eyebrow">Your watchlist</span><h2>What changed around your stocks.</h2><p>{followed.length ? 'Fresh stories and public ideas from the companies you follow.' : 'Follow a company to make this feed yours. Here is what is happening across Daybreak.'}</p></div><Link href="/app" className="db-button"><Bookmark size={15}/> Find companies</Link></header>
    {followed.length > 0 && <div className="db-activity-followed" aria-label="Followed companies">{followed.map(ticker => <Link key={ticker} href={`/app?stock=${encodeURIComponent(ticker)}`}><StockIcon ticker={ticker} size={26}/>{ticker}</Link>)}</div>}
    {feed.isPending ? <p className="db-activity-state" role="status">Finding the latest developments…</p> : feed.isError ? <div className="db-activity-state" role="status">Activity is unavailable right now. <button className="db-text-link" onClick={() => void feed.refetch()}>Try again</button></div> : <>
      {feed.data?.partial && <p className="db-small-note" role="status">Some sources are temporarily unavailable. Showing the latest available activity.</p>}
      {items.length ? <div className="db-activity-list">{items.map(item => <Link key={item.id} href={item.href} className="db-activity-item"><div className="db-activity-item-icon">{item.ticker ? <StockIcon ticker={item.ticker} size={38}/> : item.kind === 'news' ? <Newspaper size={20}/> : <Sparkles size={20}/>}</div><div><span className="db-eyebrow">{item.ticker ? `${item.ticker} · ` : ''}{item.source}{item.time ? ` · ${new Date(item.time).toLocaleDateString()}` : ''}</span><h3>{item.title}</h3><p>{item.detail}</p></div><ArrowRight size={18}/></Link>)}</div> : <div className="db-activity-state"><h3>No new developments here yet.</h3><p>Follow more companies or explore public theses while this feed grows.</p><Link href="/app/conviction" className="db-text-link">Explore public ideas <ArrowRight size={15}/></Link></div>}
    </>}
    <p className="db-small-note">Activity is drawn from available public news and published theses. A saved company is a watchlist entry, not proof of ownership.</p>
  </section>;
}
