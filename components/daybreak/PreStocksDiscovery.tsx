'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, ExternalLink, ImageIcon, X } from 'lucide-react';
import Sparkline from './Sparkline';

interface Quote {
  symbol: string; company: string; mint: string; image: string; externalUrl: string;
  tokenPrice: number | null; markPrice: number | null; impliedValuation: number | null;
  markValuation: number | null; supply: number | null; premiumPct: number | null;
}
interface Article { title: string; url: string; source: string; seenAt: string; image: string }

const usd = (n: number | null) => n == null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bn = (n: number | null) => {
  if (n == null) return '—';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return usd(n);
};
const pct = (n: number | null) => n == null ? '' : `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;

// Tokenized PRE-IPO companies (PreStocks, Solana). Discovery lane: live token price,
// implied valuation, and a live news feed behind each private company (GDELT-sourced,
// because these are private and have no public-ticker news feed).
export default function PreStocksDiscovery() {
  const [open, setOpen] = useState<Quote | null>(null);
  const q = useQuery({
    queryKey: ['prestocks'],
    queryFn: async ({ signal }) => {
      const r = await fetch('/api/prestocks', { signal });
      if (!r.ok) throw new Error('unavailable');
      return r.json() as Promise<{ items: Quote[]; stale: boolean }>;
    },
    staleTime: 30_000, refetchInterval: 60_000, retry: 1,
  });
  const items = q.data?.items ?? [];

  return (
    <>
      <div className="db-collection-head"><h2>Pre-IPO companies</h2><span className="db-small-note">Tokenized on Solana · PreStocks</span></div>
      {q.isPending ? <p className="db-small-note">Loading pre-IPO markets…</p>
        : q.isError ? <p className="db-small-note">Pre-IPO markets are unavailable right now.</p>
        : items.length === 0 ? <p className="db-small-note">No pre-IPO companies available right now.</p>
        : <>
          {q.data?.stale && <p role="status" className="db-data-notice">Showing the latest available pre-IPO prices.</p>}
          <div className="db-meme-cards db-stock-cards" data-reveal>
            {items.map((p) => {
              const up = p.premiumPct == null ? undefined : p.premiumPct >= 0;
              return (
                <div className="db-meme-card db-stock-card db-prestock-card" key={p.mint}>
                  <button className="db-prestock-open" onClick={() => setOpen(p)}>
                    <div className="db-meme-card-art db-stock-card-art">
                      <img className="db-prestock-logo db-prestock-logo-lg" src={p.image} alt="" width={72} height={72} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                      <div className="db-meme-card-badge db-stock-card-badge">
                        <div><span>PRICE</span><strong>{usd(p.tokenPrice)}</strong></div>
                        {p.premiumPct != null && <div><span>PREM</span><strong className={up ? 'up' : 'down'}>{pct(p.premiumPct)}</strong></div>}
                      </div>
                    </div>
                    <div className="db-meme-card-body">
                      <div className="db-meme-card-title"><strong>{p.symbol}</strong><span>{p.company}</span></div>
                      <div className="db-meme-card-spark"><span>24h</span><Sparkline token={p.mint} network="solana" /></div>
                      <div className="db-meme-card-stats db-stock-card-stats">
                        <div><b>{bn(p.impliedValuation)}</b><span>IMPLIED VAL</span></div>
                        <div><b>Pre-IPO</b><span>TYPE</span></div>
                      </div>
                    </div>
                  </button>
                  <a className="db-prestock-trade" href={p.externalUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Trade on PreStocks <ExternalLink size={14} /></a>
                </div>
              );
            })}
          </div>
        </>}
      <p className="db-small-note">Pre-IPO tokens are backed 1:1 by SPV exposure and confer no ownership, voting, dividend or other legal rights. Prices from PreStocks; news discovery by GDELT.</p>
      {open && <PreStockDetail quote={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function PreStockDetail({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const [selected, setSelected] = useState<Article | null>(null);
  const news = useQuery({
    queryKey: ['prestock-news', quote.symbol],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/prestocks/news?symbol=${quote.symbol}`, { signal });
      if (!r.ok) throw new Error('unavailable');
      return r.json() as Promise<{ items: Article[]; stale: boolean }>;
    },
    staleTime: 5 * 60_000, retry: 1,
  });
  const articles = news.data?.items ?? [];
  const focus = selected ?? articles[0] ?? null;

  return (
    <div className="db-dialog-overlay" role="dialog" aria-modal="true" aria-label={`${quote.company} details`} onClick={onClose}>
      <div className="db-company-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="db-dialog-top">
          <div className="db-prestock-headline">
            <img src={quote.image} alt="" width={40} height={40} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
            <div><span className="db-ticker">{quote.symbol}</span><h2>{quote.company}</h2></div>
          </div>
          <button className="db-icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="db-prestock-stats">
          <div><span>Token price</span><strong className="db-shine">{usd(quote.tokenPrice)}</strong></div>
          <div><span>Mark price</span><strong>{usd(quote.markPrice)}</strong></div>
          <div><span>Implied valuation</span><strong>{bn(quote.impliedValuation)}</strong></div>
          {quote.premiumPct != null && <div><span>Premium to mark</span><strong className={quote.premiumPct >= 0 ? 'up' : 'down'}>{pct(quote.premiumPct)}</strong></div>}
        </div>

        <a className="db-button db-blue-button" href={quote.externalUrl} target="_blank" rel="noopener noreferrer">Trade on PreStocks <ExternalLink size={15} /></a>

        <section className="db-news" aria-label={`${quote.company} news`}>
          <div className="db-section-heading"><div><span className="db-eyebrow">Behind the pre-IPO</span><h3>Live company news</h3></div><button className="db-text-link" disabled={news.isFetching} onClick={() => void news.refetch()}>{news.isFetching ? 'Loading…' : 'Refresh'}</button></div>
          {focus && <article className="db-news-story">
            <div className="db-news-image">{focus.image ? <img src={focus.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <ImageIcon size={30} />}</div>
            <div className="db-news-story-copy"><span>{focus.source}{focus.seenAt ? ` · ${new Date(focus.seenAt).toLocaleDateString()}` : ''}</span><h4>{focus.title}</h4><a className="db-text-link" href={focus.url} target="_blank" rel="noopener noreferrer">Read full article <ExternalLink size={15} /></a></div>
          </article>}
          {news.isPending && <p role="status">Finding recent coverage…</p>}
          {news.isError && <p role="status">News is temporarily unavailable.</p>}
          {!news.isPending && !news.isError && articles.length === 0 && <p>No recent coverage found.</p>}
          {articles.length > 0 && <div className="db-news-rail" aria-label="Latest articles">{articles.map((a) => <button key={a.url} aria-pressed={focus?.url === a.url} onClick={() => setSelected(a)}><span>{a.source}</span><strong>{a.title}</strong><small>{a.seenAt ? new Date(a.seenAt).toLocaleDateString() : 'Recent'}</small><ArrowRight size={16} /></button>)}</div>}
        </section>

        <p className="db-small-note">{quote.company} is a private company. This is a PreStocks token backed 1:1 by SPV exposure and confers no ownership, voting, dividend, information or other legal rights. News discovery by GDELT.</p>
      </div>
    </div>
  );
}
