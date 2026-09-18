'use client';

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Bell, Check, CircleUserRound, Compass, LockKeyhole, MessageCircle, Newspaper, ShieldCheck, Sparkles } from 'lucide-react';
import Dialog from './Dialog';
import { AvatarStack, CharacterCrew, StockIcon } from './Identity';
import { INTERESTS } from './InterestOnboarding';

interface Slide { eyebrow: string; title: string; body: string; art: ReactNode }

const SLIDES: Slide[] = [
  {
    eyebrow: 'Welcome to Daybreak', title: 'Your stocks have a world around them.',
    body: 'Discover companies, understand the products you can hold, and meet the people following the same story.',
    art: <div className="db-guide-crew"><CharacterCrew/></div>,
  },
  {
    eyebrow: 'Discover', title: 'Find companies your way.',
    body: 'Browse public stocks, Pre-IPO companies, memestocks and earning opportunities. Search by name or start from what already interests you.',
    art: <div className="db-guide-discover">{['AAPL','NVDA','SPCX'].map((ticker, index) => <div key={ticker} className={index === 1 ? 'featured' : ''}><StockIcon ticker={ticker} size={48}/><span><strong>{ticker}</strong><small>{index === 2 ? 'Pre-IPO + public' : 'Company workspace'}</small></span><ArrowRight size={15}/></div>)}</div>,
  },
  {
    eyebrow: 'Company workspace', title: 'The story, chart and conversation stay together.',
    body: 'Open a company to read sourced news, see the market response, discuss the exact article, and move into the stock’s wider community.',
    art: <div className="db-guide-context"><div className="db-guide-story"><span><Newspaper size={14}/> Latest company story</span><strong>What changed today</strong><small>Source · recent</small></div><div className="db-guide-chart"><span><BarChart3 size={14}/> Market response</span><div>{[34,52,44,69,61,86,78,94].map((height, index) => <i key={index} style={{height:`${height}%`}}/>)}</div></div><div className="db-guide-comment"><MessageCircle size={14}/><span>Article discussion stays attached</span></div></div>,
  },
  {
    eyebrow: 'Exact instruments', title: 'Same company. Different products.',
    body: 'Compare issuer, network, contract or mint, funding asset and wallet compatibility. Quotes stay review-only until you choose an external route.',
    art: <div className="db-guide-instruments"><div><span>B</span><small>Base · Coinbase</small><strong>AAPLc</strong><p>USDC on Base</p></div><div className="selected"><span><Check size={12}/></span><small>Solana · Backed</small><strong>AAPLx</strong><p>USDC on Solana</p></div><footer><ShieldCheck size={15}/><span>Review exact asset, output, costs and freshness</span></footer></div>,
  },
  {
    eyebrow: 'Your Daybreak', title: 'See what changed in your stocks.',
    body: 'Your private briefing connects verified holdings to relevant company news and upcoming issuer events. Your balance and position size stay private.',
    art: <div className="db-guide-briefing"><header><CircleUserRound size={18}/><span>Your private briefing</span><LockKeyhole size={15}/></header><div><StockIcon ticker="AAPL" size={36}/><span><strong>Apple</strong><small>Company development · today</small></span><Newspaper size={15}/></div><div><StockIcon ticker="NVDA" size={36}/><span><strong>NVIDIA</strong><small>Issuer event · upcoming</small></span><Bell size={15}/></div></div>,
  },
  {
    eyebrow: 'Holder Circles', title: 'Hold the stock. Unlock the room.',
    body: 'A supported holding on Base, Solana or PreStocks can unlock its company Circle. Daybreak stores a short-lived yes-or-no proof, never your quantity.',
    art: <div className="db-guide-circle"><StockIcon ticker="AAPL" size={62}/><div><AvatarStack/><strong>The everyday club</strong><small>Verified Apple holders · private proof</small></div><span><LockKeyhole size={14}/> Eligible</span></div>,
  },
];

export default function WelcomeGuide({ initial = [], startAtInterests = false, onDone }: { initial?: string[]; startAtInterests?: boolean; onDone: (ids: string[]) => void }) {
  const [step, setStep] = useState(startAtInterests ? SLIDES.length : 0);
  const [selected, setSelected] = useState<string[]>(initial);
  const touchStart = useRef<number | null>(null);
  const onInterests = step >= SLIDES.length;
  const total = SLIDES.length + 1;
  const go = (next: number) => setStep(Math.max(0, Math.min(SLIDES.length, next)));
  const back = () => go(step - 1);
  const next = () => go(step + 1);
  const toggle = (id: string) => setSelected((value) => value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && step > 0) { event.preventDefault(); go(step - 1); }
      if (event.key === 'ArrowRight' && !onInterests) { event.preventDefault(); go(step + 1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onInterests, step]);

  const touchEnd = (event: TouchEvent) => {
    const from = touchStart.current; touchStart.current = null;
    if (from == null) return;
    const delta = (event.changedTouches[0]?.clientX ?? from) - from;
    if (Math.abs(delta) < 48) return;
    if (delta < 0 && !onInterests) next();
    if (delta > 0 && step > 0) back();
  };

  return <Dialog label="Daybreak app walkthrough" wide onClose={() => onDone(initial)}>
    <div className="db-guide" onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={touchEnd}>
      <header className="db-guide-head"><span>Daybreak guide</span><strong>{String(step + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</strong></header>
      <div className="db-guide-dots" aria-label="Walkthrough steps">{Array.from({length: total}).map((_, index) => <button key={index} type="button" aria-label={`Go to step ${index + 1}`} aria-current={index === step ? 'step' : undefined} className={index === step ? 'on' : index < step ? 'done' : ''} onClick={() => go(index)}><i/></button>)}</div>

      {!onInterests ? <section className="db-guide-slide" key={step} aria-live="polite" aria-label={`Step ${step + 1} of ${total}`}><div className="db-guide-art">{SLIDES[step].art}</div><div className="db-guide-copy"><span className="db-micro">{SLIDES[step].eyebrow}</span><h2>{SLIDES[step].title}</h2><p>{SLIDES[step].body}</p></div></section> : <section className="db-guide-slide db-guide-interests" key="interests" aria-live="polite" aria-label={`Step ${total} of ${total}`}><div className="db-guide-copy"><span className="db-micro"><Sparkles size={15}/> Make it yours</span><h2>What are you into?</h2><p>Choose a few interests and Daybreak will put those companies first. You can change this anytime.</p></div><div className="db-onboard-grid">{INTERESTS.map((interest) => <button key={interest.id} type="button" aria-pressed={selected.includes(interest.id)} className={selected.includes(interest.id) ? 'selected' : ''} onClick={() => toggle(interest.id)}><span className="db-onboard-icons">{interest.tickers.slice(0, 3).map((ticker) => <StockIcon key={ticker} ticker={ticker} size={26}/>)}</span><strong>{interest.label}</strong></button>)}</div></section>}

      <nav className="db-guide-nav" aria-label="Walkthrough navigation">{step > 0 ? <button className="db-text-link" onClick={back}><ArrowLeft size={16}/> Back</button> : <button className="db-text-link db-guide-skip" onClick={() => onDone(selected)}>Skip tour</button>}{!onInterests ? <button className="db-button db-blue-button" onClick={next}>{step === SLIDES.length - 1 ? 'Personalize' : 'Next'} <ArrowRight size={17}/></button> : <button className="db-button db-blue-button" onClick={() => onDone(selected)}>{selected.length ? 'Enter Daybreak' : 'Explore without preferences'} <ArrowRight size={17}/></button>}</nav>
      <p className="db-guide-hint"><Compass size={13}/> Use arrow keys or swipe to move through the guide.</p>
    </div>
  </Dialog>;
}
