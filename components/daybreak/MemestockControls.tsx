'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import type { MemeRow } from './MemestockTable';

// Shared search / rank-by / stock filter for memestocks, so the CARD view and the
// TABLE view use the exact same controls. State lives here and is lifted into the
// parent panel, which passes the ranked rows to whichever view is showing.
const SORTS = [
  { key: 'h24', label: '24H vol', col: 'h24', get: (r: MemeRow) => r.volume?.h24 ?? r.volume24Usd },
  { key: 'h6', label: '6H vol', col: 'h6', get: (r: MemeRow) => r.volume?.h6 ?? 0 },
  { key: 'h1', label: '1H vol', col: 'h1', get: (r: MemeRow) => r.volume?.h1 ?? 0 },
  { key: 'liq', label: 'Liquidity', col: 'liq', get: (r: MemeRow) => r.liquidityUsd },
  { key: 'mcap', label: 'Market cap', col: 'mcap', get: (r: MemeRow) => r.marketCapUsd ?? 0 },
] as const;
export type SortKey = (typeof SORTS)[number]['key'];
export const MEME_SORTS = SORTS;

export function useMemestockList(rows: MemeRow[], showStock: boolean): { ranked: MemeRow[]; activeCol: string; controls: ReactNode } {
  const [sort, setSort] = useState<SortKey>('h24');
  const [q, setQ] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const active = SORTS.find((s) => s.key === sort)!;
  const stocks = useMemo(() => showStock ? [...new Set(rows.map((r) => r.parentTicker).filter((t): t is string => !!t))].sort() : [], [rows, showStock]);
  const needle = q.trim().toLowerCase();
  const filtered = rows.filter((r) =>
    (stockFilter === 'all' || r.parentTicker === stockFilter) &&
    (!needle || `${r.name} ${r.symbol}`.toLowerCase().includes(needle)));
  const ranked = [...filtered].sort((a, b) => active.get(b) - active.get(a));

  const controls = (
    <>
      <div className="db-meme-controls">
        <label className="db-search db-meme-search"><Search size={17} /><input aria-label="Search memestocks" placeholder="Search memestocks" value={q} onChange={(e) => setQ(e.target.value)} />{q && <button aria-label="Clear search" onClick={() => setQ('')}><X size={14} /></button>}</label>
        {showStock && stocks.length > 0 && (
          <div className="db-meme-stockfilter" role="group" aria-label="Filter by paired stock">
            <button aria-pressed={stockFilter === 'all'} className={stockFilter === 'all' ? 'active' : ''} onClick={() => setStockFilter('all')}>All stocks</button>
            {stocks.map((t) => <button key={t} aria-pressed={stockFilter === t} className={stockFilter === t ? 'active' : ''} onClick={() => setStockFilter(t)}>{t}</button>)}
          </div>
        )}
      </div>
      <div className="db-rankby" role="group" aria-label="Rank memestocks by">
        <span className="db-rankby-label">Rank by</span>
        {SORTS.map((s) => <button key={s.key} aria-pressed={sort === s.key} className={sort === s.key ? 'active' : ''} onClick={() => setSort(s.key)}>{s.label}</button>)}
      </div>
    </>
  );
  return { ranked, activeCol: active.col, controls };
}
