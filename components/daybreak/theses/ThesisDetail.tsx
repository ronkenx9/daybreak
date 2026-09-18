'use client';
import { ArrowLeft, Beaker, Bookmark, ExternalLink, Share2, Users } from 'lucide-react';
import { ProfileAvatar, StockIcon } from '../Identity';
import type { ThesisInstrumentView, ThesisView } from './types';
import ThesisTradePanel from './ThesisTradePanel';

export default function ThesisDetail({ thesis, instrument, onBack, onSimulate }: { thesis: ThesisView; instrument?: ThesisInstrumentView; onBack?: () => void; onSimulate?: () => void }) {
  const share = async () => {
    const url = `${location.origin}/theses/${thesis.slug}`;
    if (navigator.share) await navigator.share({ title: thesis.title, text: thesis.summary, url }).catch(() => {});
    else await navigator.clipboard.writeText(url);
  };
  return <section className="db-thesis-detail">
    {onBack&&<button className="db-text-link db-thesis-back" onClick={onBack}><ArrowLeft size={15}/> All theses</button>}
    <div className="db-thesis-detail-grid">
      <article className="db-thesis-reading">
        <div className="db-thesis-company"><StockIcon ticker={instrument?.ticker || 'AAPL'} size={46}/><div><strong>{instrument?.companyName || thesis.companyId}</strong><span>{thesis.tokenSymbol} / {instrument?.symbol || 'stock token'} · Solana</span></div><span className={`db-thesis-stage${thesis.mode==='paper'?' is-paper':''}`}>{thesis.mode==='paper'?'Public paper':thesis.marketStatus}</span></div>
        <h1>{thesis.title}</h1>
        <div className="db-thesis-author"><ProfileAvatar imageUrl={thesis.authorAvatarUrl} seed={thesis.authorAvatar ?? 0} size={34}/><span>{thesis.authorName || 'A Daybreak member'}</span>{thesis.publishedAt&&<time>{new Date(thesis.publishedAt).toLocaleDateString()}</time>}</div>
        <p className="db-thesis-lede">{thesis.summary}</p>
        <div className="db-thesis-prose">{thesis.body.split(/\n+/).map((paragraph)=><p key={paragraph}>{paragraph}</p>)}</div>
        <section className="db-thesis-invalidation"><span className="db-eyebrow">What would change my mind</span><p>{thesis.invalidation}</p></section>
        {thesis.horizon&&<p className="db-thesis-horizon"><strong>Time horizon</strong>{thesis.horizon}</p>}
        {!!thesis.sources.length&&<section className="db-thesis-sources"><span className="db-eyebrow">Sources</span>{thesis.sources.map((source,index)=><a href={source} target="_blank" rel="noreferrer" key={source}>Source {index+1}<ExternalLink size={13}/></a>)}</section>}
      </article>
      {thesis.mode==='paper'?<aside className="db-paper-detail-cta"><span className="db-paper-badge"><Users size={14}/> Shared simulation</span><h2>Everyone moves one curve.</h2><p>Trades, positions, paper balances and P/L are public. Join with a simulated allocation and no wallet.</p><dl><div><dt>Public trades</dt><dd>{thesis.paperTradeCount??0}</dd></div><div><dt>Pair</dt><dd>{thesis.tokenSymbol} / {instrument?.symbol}</dd></div><div><dt>Real funds</dt><dd>None</dd></div></dl><button className="db-button db-blue-button" onClick={onSimulate}><Beaker size={16}/> Open public paper market</button></aside>:<ThesisTradePanel thesis={thesis} instrument={instrument}/>}
    </div>
    <div className="db-thesis-actions"><button className="db-button" onClick={share}><Share2 size={16}/> Share thesis</button><button className="db-button" disabled><Bookmark size={16}/> Save</button></div>
  </section>;
}
