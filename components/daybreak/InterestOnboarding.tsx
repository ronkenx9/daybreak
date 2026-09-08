'use client';
import { useState } from 'react';
import Dialog from './Dialog';
import { StockIcon } from './Identity';

// Broad-interest themes → the tokenized stocks they surface. Picking a theme
// pulls those companies (and their circles) to the front of discovery.
export const INTERESTS = [
  { id: 'ai', label: 'AI & chips', tickers: ['NVDA', 'MSFT', 'GOOGL', 'INTC'] },
  { id: 'crypto', label: 'Crypto & exchanges', tickers: ['COIN', 'CRCL', 'MSTR'] },
  { id: 'everyday', label: 'Everyday brands', tickers: ['AAPL', 'AMZN'] },
  { id: 'frontier', label: 'Space & frontier', tickers: ['SPCX', 'TSLA'] },
  { id: 'bigtech', label: 'Big tech', tickers: ['META', 'GOOGL', 'AAPL', 'MSFT'] },
  { id: 'hardware', label: 'Hardware & storage', tickers: ['SNDK', 'NVDA', 'INTC'] },
] as const;

export function interestTickers(ids: string[]): Set<string> {
  const s = new Set<string>();
  for (const it of INTERESTS) if (ids.includes(it.id)) it.tickers.forEach((t) => s.add(t));
  return s;
}

export default function InterestOnboarding({ initial = [], onDone }: { initial?: string[]; onDone: (ids: string[]) => void }) {
  const [sel, setSel] = useState<string[]>(initial);
  const toggle = (id: string) => setSel((v) => v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);
  return (
    <Dialog label="Choose your interests" onClose={() => onDone(initial)}>
      <div className="db-onboard">
        <span className="db-micro">Welcome to Daybreak</span>
        <h2>What are you into?</h2>
        <p>Pick a few and we’ll bring those companies — and their circles — to the front. You can change this anytime in your profile.</p>
        <div className="db-onboard-grid">
          {INTERESTS.map((it) => (
            <button key={it.id} type="button" aria-pressed={sel.includes(it.id)} className={sel.includes(it.id) ? 'selected' : ''} onClick={() => toggle(it.id)}>
              <span className="db-onboard-icons">{it.tickers.slice(0, 3).map((t) => <StockIcon key={t} ticker={t} size={30} />)}</span>
              <strong>{it.label}</strong>
            </button>
          ))}
        </div>
        <div className="db-onboard-actions">
          <button className="db-button db-blue-button" disabled={sel.length === 0} onClick={() => onDone(sel)}>Show my daybreak</button>
          <button className="db-text-link" onClick={() => onDone(initial)}>Skip for now</button>
        </div>
      </div>
    </Dialog>
  );
}
