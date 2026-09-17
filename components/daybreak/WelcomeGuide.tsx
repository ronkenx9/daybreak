'use client';
import { useState } from 'react';
import { Compass, MessagesSquare, Coins, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import Dialog from './Dialog';
import { StockIcon } from './Identity';
import { INTERESTS } from './InterestOnboarding';

// First-visit guide that explains Daybreak in plain terms before the interest
// picker. Normies land here and learn the whole loop — discover, join the chat,
// what $DAYC unlocks — instead of a bare grid of stocks. The last step is the
// interest picker, so onboarding still personalises discovery in one flow.

interface Slide { icon: React.ReactNode; eyebrow: string; title: string; body: string; art: React.ReactNode }

const SLIDES: Slide[] = [
  {
    icon: <Sparkles size={20} />, eyebrow: 'Welcome to Daybreak', title: 'Stocks, but social.',
    body: 'Real tokenized stocks — Apple, Nvidia, even pre-IPO names like OpenAI — but built around people and culture, not just a buy button.',
    art: <div className="db-guide-stack"><StockIcon ticker="NVDA" size={54} /><StockIcon ticker="AAPL" size={54} /><StockIcon ticker="TSLA" size={54} /></div>,
  },
  {
    icon: <Compass size={20} />, eyebrow: 'Discover', title: 'Find stocks through what you love.',
    body: 'Pick your interests and the right companies come first — with live prices, the news behind them, and the memes that make them move.',
    art: <div className="db-guide-badge db-guide-blue"><Compass size={40} /></div>,
  },
  {
    icon: <MessagesSquare size={20} />, eyebrow: 'Circles', title: 'Every stock has a group chat.',
    body: 'Open a stock and its community is right there — talk, share, and follow the moment together. That’s a Circle. The people are the point.',
    art: <div className="db-guide-badge db-guide-green"><MessagesSquare size={40} /></div>,
  },
  {
    icon: <Coins size={20} />, eyebrow: '$DAYC', title: 'Hold $DAYC, unlock the world.',
    body: 'The Daybreak token unlocks Circle membership, the power to pin and shape communities, and launching your own community tokens.',
    art: <div className="db-guide-badge db-guide-gold"><Coins size={40} /></div>,
  },
];

export default function WelcomeGuide({ initial = [], startAtInterests = false, onDone }: { initial?: string[]; startAtInterests?: boolean; onDone: (ids: string[]) => void }) {
  const [step, setStep] = useState(startAtInterests ? SLIDES.length : 0);
  const [sel, setSel] = useState<string[]>(initial);
  const onInterests = step >= SLIDES.length;
  const total = SLIDES.length + 1;
  const toggle = (id: string) => setSel((v) => v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);
  const back = () => setStep((s) => Math.max(0, s - 1));
  const next = () => setStep((s) => Math.min(SLIDES.length, s + 1));

  return (
    <Dialog label="Welcome to Daybreak" onClose={() => onDone(initial)}>
      <div className="db-guide">
        <div className="db-guide-dots" aria-hidden="true">
          {Array.from({ length: total }).map((_, i) => <i key={i} className={i === step ? 'on' : i < step ? 'done' : undefined} />)}
        </div>

        {!onInterests ? (
          <div className="db-guide-slide" key={step}>
            <div className="db-guide-art">{SLIDES[step].art}</div>
            <span className="db-micro">{SLIDES[step].icon} {SLIDES[step].eyebrow}</span>
            <h2>{SLIDES[step].title}</h2>
            <p>{SLIDES[step].body}</p>
          </div>
        ) : (
          <div className="db-guide-slide" key="interests">
            <span className="db-micro"><Sparkles size={16} /> Last step</span>
            <h2>What are you into?</h2>
            <p>Tap what you like and we’ll put those stocks up top. Change it anytime.</p>
            <div className="db-onboard-grid">
              {INTERESTS.map((it) => (
                <button key={it.id} type="button" aria-pressed={sel.includes(it.id)} className={sel.includes(it.id) ? 'selected' : ''} onClick={() => toggle(it.id)}>
                  <span className="db-onboard-icons">{it.tickers.slice(0, 3).map((t) => <StockIcon key={t} ticker={t} size={26} />)}</span>
                  <strong>{it.label}</strong>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="db-guide-nav">
          {step > 0 ? <button className="db-text-link" onClick={back}><ArrowLeft size={16} /> Back</button> : <button className="db-text-link db-guide-skip" onClick={() => onDone(sel)}>Skip</button>}
          {!onInterests
            ? <button className="db-button db-blue-button" onClick={next}>Next <ArrowRight size={17} /></button>
            : <button className="db-button db-blue-button" onClick={() => onDone(sel)}>{sel.length ? 'Enter Daybreak' : 'Skip for now'} <ArrowRight size={17} /></button>}
        </div>
      </div>
    </Dialog>
  );
}
