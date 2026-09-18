import Link from 'next/link';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { ProfileAvatar, StockIcon, Wordmark } from '../Identity';
import type { ThesisInstrumentView, ThesisView } from './types';

export default function PublicThesisPage({ thesis, instrument }: { thesis: ThesisView; instrument?: ThesisInstrumentView }) {
  return <main className="db-public-thesis">
    <header><Link href="/"><Wordmark/></Link><Link href={`/app/conviction?thesis=${thesis.slug}${thesis.mode==='paper'?'&simulate=1':''}`} className="db-button db-blue-button">Open in Daybreak <ArrowRight size={15}/></Link></header>
    <Link href="/app/conviction" className="db-text-link"><ArrowLeft size={14}/> Explore conviction</Link>
    <div className="db-public-thesis-grid"><article>
      <div className="db-thesis-company"><StockIcon ticker={instrument?.ticker||'AAPL'} size={48}/><div><strong>{instrument?.companyName||thesis.companyId}</strong><span>{thesis.tokenSymbol} / {instrument?.symbol||'stock token'} · Solana</span></div><span className={`db-thesis-stage${thesis.mode==='paper'?' is-paper':''}`}>{thesis.mode==='paper'?'Public paper':thesis.marketStatus}</span></div>
      <h1>{thesis.title}</h1><p className="db-thesis-lede">{thesis.summary}</p>
      <div className="db-thesis-author"><ProfileAvatar imageUrl={thesis.authorAvatarUrl} seed={thesis.authorAvatar??0} size={34}/><span>{thesis.authorName||'A Daybreak member'}</span>{thesis.publishedAt&&<time>{new Date(thesis.publishedAt).toLocaleDateString()}</time>}</div>
      <div className="db-thesis-prose">{thesis.body.split(/\n+/).map((paragraph)=><p key={paragraph}>{paragraph}</p>)}</div>
      <section className="db-thesis-invalidation"><span className="db-eyebrow">What would change my mind</span><p>{thesis.invalidation}</p></section>
      {!!thesis.sources.length&&<div className="db-thesis-sources">{thesis.sources.map((source,index)=><a href={source} target="_blank" rel="noreferrer" key={source}>Source {index+1}<ExternalLink size={13}/></a>)}</div>}
    </article><aside className="db-thesis-public-cta"><span className="db-eyebrow">{thesis.mode==='paper'?'Public paper market':'Daybreak thesis market'}</span><h2>{thesis.mode==='paper'?'Watch conviction move.':'Read first. Back second.'}</h2><p>{thesis.mode==='paper'?'Join the same shared simulation as everyone else. Trades, positions and paper P/L are public.':'Inspect the exact pair and current quote inside Daybreak before signing anything.'}</p><Link href={`/app/conviction?thesis=${thesis.slug}${thesis.mode==='paper'?'&simulate=1':''}`} className="db-button db-blue-button">{thesis.mode==='paper'?'Open paper market':'Review this market'} <ArrowRight size={16}/></Link><small>{thesis.mode==='paper'?'No wallet, signature or real asset is used.':'Backing exchanges the stock token for a thesis position. It is not equity or a guaranteed return.'}</small></aside></div>
  </main>;
}
