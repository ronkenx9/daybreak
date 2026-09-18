'use client';
import { ArrowRight, Clock3 } from 'lucide-react';
import { ProfileAvatar, StockIcon } from '../Identity';
import type { ThesisInstrumentView, ThesisView } from './types';

export default function ThesisCard({ thesis, instrument, onOpen }: { thesis: ThesisView; instrument?: ThesisInstrumentView; onOpen: () => void }) {
  return <article className="db-thesis-card">
    <div className="db-thesis-company"><StockIcon ticker={instrument?.ticker || 'AAPL'} size={38}/><div><strong>{instrument?.companyName || thesis.companyId}</strong><span>{instrument?.symbol || 'Stock token'} · Solana</span></div><span className="db-thesis-stage">{thesis.marketStatus === 'migrated' ? 'Mature market' : 'Bonding curve'}</span></div>
    <h3>{thesis.title}</h3>
    <p>{thesis.summary}</p>
    <div className="db-thesis-author"><ProfileAvatar imageUrl={thesis.authorAvatarUrl} seed={thesis.authorAvatar ?? 0} size={30}/><span>{thesis.authorName || 'A Daybreak member'}</span>{thesis.publishedAt&&<time><Clock3 size={12}/>{new Date(thesis.publishedAt).toLocaleDateString()}</time>}</div>
    <div className="db-thesis-market-line"><span>Pair</span><strong>{thesis.tokenSymbol} / {instrument?.symbol || 'stock token'}</strong></div>
    <button className="db-text-link" onClick={onOpen}>Read the thesis <ArrowRight size={15}/></button>
  </article>;
}
