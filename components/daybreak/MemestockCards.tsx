'use client';
import { Heart } from 'lucide-react';
import { StockIcon } from './Identity';
import Sparkline from './Sparkline';
import type { MemeTokenData } from './MemestockDetail';

type Row = MemeTokenData & { parentTicker?: string; parentSymbol?: string };

const compact = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
};
const age = (ms?: number | null) => {
  if (!ms || ms <= 0) return '—';
  const h = ms / 3.6e6;
  if (h < 1) return Math.max(1, Math.round(h * 60)) + 'm';
  if (h < 24) return Math.round(h) + 'h';
  return Math.round(h / 24) + 'd';
};

export default function MemestockCards({ rows, showStock, onSelect }: { rows: Row[]; showStock?: boolean; onSelect: (r: Row) => void }) {
  return (
    <div className="db-meme-cards" data-reveal>
      {rows.map((r) => {
        const ch = r.change?.h24;
        const up = ch == null ? undefined : ch >= 0;
        return (
          <button key={r.address + (r.parentTicker ?? '')} className="db-meme-card" onClick={() => onSelect(r)}>
            <div className="db-meme-card-art">
              {r.imageUrl
                ? <img src={r.imageUrl} alt="" loading="lazy" />
                : <span className="db-meme-card-fallback">{r.symbol.slice(0, 2).toUpperCase()}</span>}
              <span className="db-meme-card-fav" aria-hidden="true"><Heart size={15} /></span>
              <div className="db-meme-card-badge">
                <div><span>MCAP</span><strong>{compact(r.marketCapUsd)}</strong></div>
                <div><span>24H</span><strong className={up === false ? 'down' : 'up'}>{up ? '+' : ''}{ch == null ? '—' : ch.toFixed(1) + '%'}</strong></div>
              </div>
            </div>
            <div className="db-meme-card-body">
              <div className="db-meme-card-title"><strong>${r.symbol}</strong><span>{r.name}</span>{showStock && r.parentTicker && <StockIcon ticker={r.parentTicker} size={20} />}</div>
              <div className="db-meme-card-spark"><span>24h</span><Sparkline token={r.address} up={up} /></div>
              <div className="db-meme-card-stats">
                <div><b>{age(r.ageMs)}</b><span>AGE</span></div>
                <div><b>{compact(r.volume24Usd)}</b><span>VOL 24H</span></div>
                <div><b>{r.txns24 ?? '—'}</b><span>TXNS</span></div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
