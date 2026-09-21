'use client';

import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import Dialog from './Dialog';
import { StockIcon } from './Identity';
import { INTERESTS } from './InterestOnboarding';

export default function WelcomeGuide({ initial = [], onDone }: { initial?: string[]; startAtInterests?: boolean; onDone: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);

  return <Dialog label="Choose your interests" onClose={() => onDone(initial)}>
    <div className="db-interest-intro">
      <div className="db-dialog-top"><span className="db-eyebrow">Make Daybreak yours</span><button className="db-icon-button" aria-label="Close interests" onClick={() => onDone(initial)}><X size={18}/></button></div>
      <h2>What stocks are you into?</h2>
      <p>Pick a few interests. We’ll bring those companies to the front so you can explore their stories, public theses and Circles.</p>
      <div className="db-interest-intro-options" role="group" aria-label="Stock interests">{INTERESTS.map(interest => <button key={interest.id} type="button" aria-pressed={selected.includes(interest.id)} onClick={() => toggle(interest.id)}><span>{interest.tickers.slice(0, 3).map(ticker => <StockIcon key={ticker} ticker={ticker} size={27}/>)}</span><strong>{interest.label}</strong></button>)}</div>
      <button className="db-button db-blue-button db-interest-intro-cta" onClick={() => onDone(selected)}>{selected.length ? 'Explore my stocks' : 'Explore all stocks'} <ArrowRight size={16}/></button>
      <p className="db-small-note">You can change these anytime in You.</p>
    </div>
  </Dialog>;
}
