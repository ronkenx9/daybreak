'use client';
import {ChevronRight} from 'lucide-react';
import type {MemeTokenData} from './MemestockDetail';
import MemeLogo from './MemeLogo';

// A memestock is any row; the trending feed also carries its parent stock.
export type MemeRow = MemeTokenData & {parentTicker?: string; parentSymbol?: string};

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

// Presentational only: rows arrive already filtered + ranked (see useMemestockList),
// and activeCol drives the highlighted volume/liq/mcap column.
export default function MemestockTable({rows, showStock, onSelect, activeCol = 'h24'}: {rows: MemeRow[]; showStock: boolean; onSelect: (row: MemeRow) => void; activeCol?: string}) {
  const ranked = rows;
  const active = {col: activeCol, label: activeCol === 'liq' ? 'Liquidity' : activeCol === 'mcap' ? 'Market cap' : activeCol.toUpperCase().replace('H', 'H ') + 'vol'};

  return (
    <div className="db-meme-rank">
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
                    <MemeLogo symbol={r.symbol} imageUrl={r.imageUrl} />
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
      {ranked.length === 0 && <p className="db-small-note db-meme-empty">No memestocks match. Try clearing the search or filter.</p>}
    </div>
  );
}
