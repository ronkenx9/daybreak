'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Bookmark, MessageCircle, Share2 } from 'lucide-react';
import { useState } from 'react';
import type { StockToken } from '@/lib/base/tokens';
import type { StockPrice } from '@/lib/base/model';
import type { ThesisView } from './theses/types';
import XLayerBackingBadge from './theses/XLayerBackingBadge';
import { companyThesesForTicker, thesisCompanyId } from '@/lib/theses/company-journey';
import { ProfileAvatar } from './Identity';

type ThesisFeed = { items: ThesisView[] };

export default function CompanyJourney({ token, price, saved, onToggleSave, onDiscussion }: {
  token: StockToken;
  price?: StockPrice;
  saved: boolean;
  onToggleSave: () => void;
  onDiscussion: () => void;
}) {
  const [shareStatus, setShareStatus] = useState('');
  const companyId = thesisCompanyId(token.ticker);
  const theses = useQuery({
    queryKey: ['company-theses', companyId],
    enabled: !!companyId,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/theses?${new URLSearchParams({ mode: 'all', q: companyId!, page: '0' })}`, { signal });
      if (!response.ok) throw new Error('Theses unavailable');
      return companyThesesForTicker(token.ticker, (await response.json() as ThesisFeed).items, 3);
    },
    staleTime: 20_000,
    retry: false,
  });
  const shareCompany = async () => {
    const url = `${location.origin}/app?stock=${encodeURIComponent(token.ticker)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${token.name} on Daybreak`, url });
      else { await navigator.clipboard.writeText(url); setShareStatus('Company link copied.'); }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('Could not share. Copy the address from your browser.');
    }
  };
  // The underlying equity reference has its own fast endpoint; the Base oracle price is the fallback.
  const equity = useQuery({
    queryKey: ['equity-price', token.ticker],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/equity-prices?tickers=${encodeURIComponent(token.ticker)}`, { signal });
      if (!response.ok) throw new Error('Price unavailable');
      return ((await response.json()) as { prices: Record<string, { priceUsd: number | null; asOf: number | null } | undefined> }).prices[token.ticker] ?? null;
    },
    staleTime: 20_000, refetchInterval: 60_000, retry: 2,
  });
  const refUsd = equity.data?.priceUsd ?? (price?.state !== 'paused' ? price?.priceUsd ?? null : null);
  const refAt = equity.data?.priceUsd != null ? equity.data.asOf : price?.updatedAt ?? null;
  const priceLabel = refUsd != null ? refUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : equity.isPending && price === undefined ? 'Loading price…'
    : price?.state === 'paused' ? 'Oracle paused' : 'Price unavailable';

  return <section className="db-company-journey" aria-label={`${token.name} at a glance`}>
    <div className="db-company-journey-head">
      <div><span className="db-eyebrow">Company · {token.ticker}</span><p>Explore the company, what people believe, and the conversation around it.</p></div>
      <div className="db-company-journey-actions">
        <button type="button" className="db-button" aria-pressed={saved} onClick={onToggleSave}><Bookmark size={15} fill={saved ? 'currentColor' : 'none'}/>{saved ? 'Following' : 'Follow'}</button>
        <button type="button" className="db-button" onClick={() => void shareCompany()}><Share2 size={15}/> Share</button>
      </div>
    </div>
    {shareStatus && <p className="db-small-note" role="status">{shareStatus}</p>}
    <div className="db-company-journey-price"><span>Underlying equity reference</span><strong>{priceLabel}</strong><small>{refAt ? `Updated ${new Date(refAt).toLocaleString()} · ` : ''}This is not a token trade quote.</small></div>

    <div className="db-company-journey-section-head"><div><span className="db-eyebrow">Public ideas</span><h3>What do people believe?</h3></div><Link href={`/app/conviction?stock=${encodeURIComponent(token.ticker)}`} className="db-text-link">All {token.ticker} theses <ArrowRight size={15}/></Link></div>
    {companyId && theses.isPending ? <p className="db-company-journey-state" role="status">Finding public theses…</p> : theses.isError ? <div className="db-company-journey-state" role="status">Theses are unavailable right now. <Link href="/app/conviction">Explore conviction</Link></div> : !companyId ? <p className="db-company-journey-state">No supported thesis market is available for this stock yet.</p> : theses.data?.length ? <div className="db-company-journey-theses">{theses.data.map(thesis => <article key={thesis.id} className="db-company-journey-thesis">
      <div className="db-company-journey-thesis-meta"><span>{thesis.mode === 'paper' ? 'Public paper' : 'Live market'}</span>{thesis.mode === 'paper' && <span>{thesis.paperTradeCount ?? 0} public trades</span>}<XLayerBackingBadge slug={thesis.slug} companyId={thesis.companyId}/></div>
      <h4><Link href={`/theses/${thesis.slug}`}>{thesis.title}</Link></h4><p>{thesis.summary}</p>
      <div className="db-company-journey-invalidation"><strong>What would change their mind</strong><span>{thesis.invalidation}</span></div>
      <div className="db-company-journey-thesis-foot"><span><ProfileAvatar imageUrl={thesis.authorAvatarUrl} seed={thesis.authorAvatar ?? 0} size={24}/>{thesis.authorName || (thesis.authorKind === 'agent' ? 'Daybreak agent' : 'Daybreak member')}</span><Link className="db-text-link" href={`/app/conviction?thesis=${encodeURIComponent(thesis.slug)}${thesis.mode === 'paper' ? '&simulate=1' : ''}`}>{thesis.mode === 'paper' ? 'Try on Paper' : 'Review market'} <ArrowRight size={14}/></Link></div>
    </article>)}</div> : <div className="db-company-journey-state">No public {token.ticker} thesis yet. Start with a paper idea so others can discuss and test it. <Link href={`/app/conviction?stock=${encodeURIComponent(token.ticker)}&create=paper`}>Create a paper thesis <ArrowRight size={14}/></Link></div>}
    <button type="button" className="db-company-journey-discuss" onClick={onDiscussion}><MessageCircle size={19}/><span><strong>Talk about {token.name}</strong><small>Open the holder Circle and see what the community is discussing.</small></span><ArrowRight size={17}/></button>
  </section>;
}
