'use client';
import {useState} from 'react';
import {ChevronRight} from 'lucide-react';
import type {MemeTokenData} from './MemestockDetail';

// A memestock is any row; the trending feed also carries its parent stock.
export type MemeRow = MemeTokenData & {parentTicker?: string; parentSymbol?: string};

// Rank-by options map to fields DexScreener actually returns for a Base pair.
// There is no 7-day or weekly volume in the source, so we don't invent one.
const SORTS = [
  {key: 'h24', label: '24H vol', col: 'h24', get: (r: MemeRow) => r.volume?.h24 ?? r.volume24Usd},
  {key: 'h6', label: '6H vol', col: 'h6', get: (r: MemeRow) => r.volume?.h6 ?? 0},
  {key: 'h1', label: '1H vol', col: 'h1', get: (r: MemeRow) => r.volume?.h1 ?? 0},
  {key: 'liq', label: 'Liquidity', col: 'liq', get: (r: MemeRow) => r.liquidityUsd},
  {key: 'mcap', label: 'Market cap', col: 'mcap', get: (r: MemeRow) => r.marketCapUsd ?? 0},
] as const;
type SortKey = (typeof SORTS)[number]['key'];

const compact = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${Math.round(n)}`;
};
const price = (n: number | null) => {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1) return n.toLocaleString('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 2});
  return `$${n.toPrecision(3).replace(/0+$/, '')}`;
};
const pct = (n: number | undefined) => {
  if (n == null || !Number.isFinite(n)) return <span className="db-chg db-chg-flat">—</span>;
  const cls = n > 0 ? 'db-chg-up' : n < 0 ? 'db-chg-down' : 'db-chg-flat';
  return <span className={`db-chg ${cls}`}>{n > 0 ? '+' : ''}{n.toFixed(2)}%</span>;
};

export default function MemestockTable({rows, showStock, onSelect}: {rows: MemeRow[]; showStock: boolean; onSelect: (row: MemeRow) => void}) {
  const [sort, setSort] = useState<SortKey>('h24');
  const active = SORTS.find((s) => s.key === sort)!;
  const ranked = [...rows].sort((a, b) => active.get(b) - active.get(a));

  return (
    <div className="db-meme-rank">
      <div className="db-rankby" role="group" aria-label="Rank memestocks by">
        <span className="db-rankby-label">Rank by</span>
        {SORTS.map((s) => (
          <button key={s.key} aria-pressed={sort === s.key} className={sort === s.key ? 'active' : ''} onClick={() => setSort(s.key)}>{s.label}</button>
        ))}
      </div>
      <div className="db-meme-table-wrap">
        <table className="db-meme-table">
          <caption className="sr-only">Memestocks ranked by {active.label}. Live pool data via DexScreener; independent, speculative tokens.</caption>
          <thead>
            <tr>
              <th scope="col" className="db-col-rank">#</th>
              <th scope="col" className="db-col-token">Token</th>
              {showStock && <th scope="col">Stock</th>}
              <th scope="col" className="db-col-num">Price</th>
              <th scope="col" className="db-col-num">1H</th>
              <th scope="col" className="db-col-num">6H</th>
              <th scope="col" className="db-col-num">24H</th>
              <th scope="col" className={`db-col-num ${['h1', 'h6', 'h24'].includes(active.col) ? 'is-active' : ''}`}>Volume</th>
              <th scope="col" className={`db-col-num ${active.col === 'liq' ? 'is-active' : ''}`}>Liquidity</th>
              <th scope="col" className={`db-col-num ${active.col === 'mcap' ? 'is-active' : ''}`}>MCap</th>
              <th scope="col" className="db-col-go"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => {
              const vol = active.col === 'h1' ? (r.volume?.h1 ?? 0) : active.col === 'h6' ? (r.volume?.h6 ?? 0) : (r.volume?.h24 ?? r.volume24Usd);
              const open = () => onSelect(r);
              return (
                <tr key={r.address + (r.parentTicker ?? '')} className="db-meme-trow" tabIndex={0} role="button"
                  aria-label={`Open ${r.name || r.symbol}${r.parentTicker ? `, paired with ${r.parentTicker}` : ''}`}
                  onClick={open} onKeyDown={(e) => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); open();}}}>
                  <td className="db-col-rank"><span className="db-meme-idx">{i + 1}</span></td>
                  <td className="db-col-token">
                    <span className="db-token-mono db-meme-mono">{r.symbol.slice(0, 2)}</span>
                    <span className="db-meme-name"><strong>{r.name || r.symbol}</strong><small>{r.symbol}{r.lowLiquidity ? ' · low liq' : ''}</small></span>
                  </td>
                  {showStock && <td><span className="db-meme-parent">{r.parentTicker}</span></td>}
                  <td className="db-col-num db-mono-num">{price(r.priceUsd)}</td>
                  <td className="db-col-num">{pct(r.change?.h1)}</td>
                  <td className="db-col-num">{pct(r.change?.h6)}</td>
                  <td className="db-col-num">{pct(r.change?.h24)}</td>
                  <td className={`db-col-num db-mono-num ${['h1', 'h6', 'h24'].includes(active.col) ? 'is-active' : ''}`}>{compact(vol)}</td>
                  <td className={`db-col-num db-mono-num ${active.col === 'liq' ? 'is-active' : ''}`}>{compact(r.liquidityUsd)}</td>
                  <td className={`db-col-num db-mono-num ${active.col === 'mcap' ? 'is-active' : ''}`}>{r.marketCapUsd ? compact(r.marketCapUsd) : '—'}</td>
                  <td className="db-col-go" aria-hidden="true"><ChevronRight size={16} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
