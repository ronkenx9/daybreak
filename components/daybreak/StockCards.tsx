'use client';
import { Bookmark } from 'lucide-react';
import { StockIcon } from './Identity';
import Sparkline from './Sparkline';
import type { StockToken } from '@/lib/base/tokens';
import type { StockPrice } from '@/lib/base/model';

// Stock discovery in the memestocks card style: big logo art + a price badge, a
// clean body with ticker/name and the on-chain price. Same visual shell as
// MemestockCards (.db-meme-card) so the lanes feel like one system.
const fmtUsd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export default function StockCards({ tokens, prices, pricesLoaded, pricesError, saved, onToggleSave, onOpen, feature }: {
  tokens: StockToken[];
  prices: Record<string, StockPrice | undefined>;
  pricesLoaded: boolean;
  pricesError?: boolean;
  saved: string[];
  onToggleSave: (ticker: string) => void;
  onOpen: (token: StockToken) => void;
  feature?: React.ReactNode; // an optional featured card rendered first (e.g. the platform token)
}) {
  return (
    <div className="db-meme-cards db-stock-cards" data-reveal>
      {feature}
      {tokens.map((token) => {
        const p = prices[token.ticker];
        const priceText = !pricesLoaded ? '—' : p && p.priceUsd != null && p.state !== 'paused' ? fmtUsd(p.priceUsd) : 'N/A';
        const basis = !pricesLoaded ? 'Loading' : p?.state === 'paused' ? 'Oracle paused' : p?.priceUsd == null ? 'Unavailable' : pricesError ? 'Previous ref' : p?.isStale ? 'Aged ref' : 'Oracle · Base';
        const isSaved = saved.includes(token.ticker);
        return (
          <article key={token.ticker} className="db-meme-card db-stock-card">
            <button className="db-stock-card-open" aria-label={`Explore ${token.name}`} onClick={() => onOpen(token)}>
            <div className="db-meme-card-art db-stock-card-art">
              <StockIcon ticker={token.ticker} size={72} />
              <div className="db-meme-card-badge db-stock-card-badge">
                <div><span>PRICE</span><strong>{priceText}</strong></div>
              </div>
            </div>
            <div className="db-meme-card-body">
              <div className="db-meme-card-title"><strong>{token.ticker}</strong><span>{token.name}</span></div>
              <div className="db-meme-card-spark"><span>24h</span><Sparkline token={token.token} /></div>
              <div className="db-meme-card-stats db-stock-card-stats">
                <div><b>{token.onchainSymbol}</b><span>SYMBOL</span></div>
                <div><b>{basis}</b><span>PRICE BASIS</span></div>
              </div>
            </div>
            </button>
            <button type="button" className={`db-meme-card-fav${isSaved ? ' is-on' : ''}`} aria-label={`${isSaved ? 'Unfollow' : 'Follow'} ${token.name}`} aria-pressed={isSaved} onClick={() => onToggleSave(token.ticker)}><Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} /></button>
          </article>
        );
      })}
    </div>
  );
}
