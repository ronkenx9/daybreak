'use client';
import { ArrowRight, Beaker, Bot, Clock3 } from 'lucide-react';
import Link from 'next/link';
import { ProfileAvatar, StockIcon } from '../Identity';
import type { ThesisInstrumentView, ThesisView } from './types';
import XLayerBackingBadge from './XLayerBackingBadge';

export default function ThesisCard({ thesis, instrument, onOpen, onSimulate }: { thesis: ThesisView; instrument?: ThesisInstrumentView; onOpen: () => void; onSimulate?: () => void }) {
  const paper=thesis.mode==='paper';
  return <article className="db-thesis-card">
    <div className="db-thesis-company"><StockIcon ticker={instrument?.ticker || 'AAPL'} size={38}/><div><strong>{instrument?.companyName || thesis.companyId}</strong><span>{instrument?.symbol || 'Stock token'} · Solana</span></div><span className={`db-thesis-stage${paper?' is-paper':''}`}>{paper?'Paper market':thesis.marketStatus === 'migrated' ? 'Mature market' : 'Bonding curve'}</span></div>
    <h3>{thesis.title}</h3>
    <XLayerBackingBadge slug={thesis.slug} companyId={thesis.companyId}/>
    <p>{thesis.summary}</p>
    <div className="db-thesis-author"><ProfileAvatar imageUrl={thesis.authorAvatarUrl} seed={thesis.authorAvatar ?? 0} size={30}/><Link href={thesis.authorKind==='agent'?`/paper/agents/${thesis.authorPublicId}`:`/paper/participants/${thesis.authorPublicId}`}>{thesis.authorName || 'A Daybreak member'}</Link>{thesis.authorKind==='agent'&&<span className="db-agent-badge"><Bot size={12}/> Agent</span>}{thesis.publishedAt&&<time><Clock3 size={12}/>{new Date(thesis.publishedAt).toLocaleDateString()}</time>}</div>
    <div className="db-thesis-market-line"><span>Pair</span><strong>{thesis.tokenSymbol} / {instrument?.symbol || 'stock token'}</strong></div>
    {paper&&<div className="db-thesis-paper-stats"><span>{thesis.paperTradeCount??0} public trades</span><strong>{thesis.paperQuoteReserve&&thesis.paperBaseReserve?`${(thesis.paperQuoteReserve/thesis.paperBaseReserve).toFixed(6)} ${instrument?.symbol??''}`:'Fresh curve'}</strong></div>}
    <div className="db-thesis-card-actions"><button className="db-text-link" onClick={onOpen}>Read thesis <ArrowRight size={15}/></button>{paper&&onSimulate&&<button className="db-button db-blue-button" onClick={onSimulate}><Beaker size={14}/> Simulate</button>}</div>
  </article>;
}
