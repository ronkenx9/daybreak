'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Beaker, LoaderCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { StockIcon } from '../Identity';
import { createPaperAccount, executePaperTrade, PAPER_FEE_BPS, paperPositionMetrics, quotePaperTrade, restorePaperAccount, type PaperAccount, type PaperDirection, type PaperQuote } from '@/lib/theses/paper';
import type { ThesisInstrumentView } from './types';

const STORAGE_KEY = 'daybreak:conviction:paper:v1';
const format = (value: number, maximumFractionDigits = 4) => new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
const signed = (value: number, symbol: string) => `${value >= 0 ? '+' : '−'}${format(Math.abs(value))} ${symbol}`;

export default function PaperTradingMode({ instruments, instrumentState, onClose }: { instruments: ThesisInstrumentView[]; instrumentState: 'loading'|'ready'|'error'; onClose: () => void }) {
  const available = useMemo(()=>instruments.filter((instrument) => instrument.lifecycle.buy && instrument.lifecycle.sell),[instruments]);
  const [instrumentId,setInstrumentId]=useState(available[0]?.id ?? '');
  const [account,setAccount]=useState<PaperAccount>(()=>createPaperAccount(available));
  const [direction,setDirection]=useState<PaperDirection>('buy');
  const [amount,setAmount]=useState('');
  const [quote,setQuote]=useState<PaperQuote|null>(null);
  const [error,setError]=useState('');
  const [hydrated,setHydrated]=useState(false);
  const instrument=available.find((item)=>item.id===instrumentId) ?? available[0];

  useEffect(()=>{
    if(!available.length)return;
    try { const stored=localStorage.getItem(STORAGE_KEY); setAccount(restorePaperAccount(stored?JSON.parse(stored):null,available)); } catch { setAccount(createPaperAccount(available)); }
    setInstrumentId(current=>available.some((item)=>item.id===current)?current:available[0].id);
    setHydrated(true);
  },[available]);
  useEffect(()=>{if(hydrated&&available.length)localStorage.setItem(STORAGE_KEY,JSON.stringify(account))},[account,available.length,hydrated]);
  useEffect(()=>{setQuote(null);setError('');setAmount('')},[direction,instrumentId]);

  const metrics=useMemo(()=>instrument?paperPositionMetrics(account,instrument.id):null,[account,instrument]);
  const balance=instrument?account.stockBalances[instrument.id]??0:0;
  const trades=instrument?account.trades.filter((trade)=>trade.instrumentId===instrument.id):[];
  const preview=()=>{if(!instrument)return;setError('');try{const input=Number(amount);if(direction==='buy'&&input>balance)throw Error('Not enough paper stock tokens');if(direction==='sell'&&input>(metrics?.quantity??0))throw Error('Not enough paper thesis tokens');setQuote(quotePaperTrade(account.markets[instrument.id],direction,input))}catch(caught){setQuote(null);setError(caught instanceof Error?caught.message:'Paper quote unavailable')}};
  const execute=()=>{if(!instrument||!quote)return;try{setAccount(current=>executePaperTrade(current,instrument.id,direction,quote.inputAmount));setQuote(null);setAmount('');setError('')}catch(caught){setError(caught instanceof Error?caught.message:'Paper trade failed')}};
  const reset=()=>{if(!confirm('Reset every simulated balance, position and paper trade?'))return;const next=createPaperAccount(available);setAccount(next);setAmount('');setQuote(null);setError('')};

  if(!instrument||!metrics)return <section className="db-paper-mode"><button className="db-text-link" onClick={onClose}><ArrowLeft size={15}/> Conviction</button>{instrumentState==='loading'?<div className="db-thesis-loading"><LoaderCircle className="db-spin" size={20}/> Preparing paper markets…</div>:<div className="db-thesis-empty"><Beaker size={26}/><h3>Paper mode is unavailable.</h3><p>The supported stock-token list could not be loaded.</p></div>}</section>;
  const thesisSymbol=`${instrument.ticker}IDEA`;
  return <section className="db-paper-mode">
    <div className="db-paper-top"><button className="db-text-link" onClick={onClose}><ArrowLeft size={15}/> Conviction</button><button className="db-text-link" onClick={reset}><RotateCcw size={14}/> Reset paper account</button></div>
    <header className="db-paper-head"><div><span className="db-paper-badge"><Beaker size={14}/> Simulation · no wallet</span><h2>Learn the pair by trading it.</h2><p>Practice exchanging a stock token for a thesis token. Every balance and result below is simulated and stored only in this browser.</p></div><label><span>Practice with</span><select value={instrument.id} onChange={event=>setInstrumentId(event.target.value)}>{available.map((item)=><option key={item.id} value={item.id}>{item.companyName} · {item.symbol}</option>)}</select></label></header>
    <div className="db-paper-summary">
      <div><span>Paper stock balance</span><strong>{format(balance)} {instrument.symbol}</strong><small>Started with 10 simulated tokens</small></div>
      <div><span>Thesis position</span><strong>{format(metrics.quantity,2)} {thesisSymbol}</strong><small>Worth {format(metrics.marketValueQuote)} {instrument.symbol}</small></div>
      <div><span>Total paper P/L</span><strong className={metrics.totalPnlQuote>=0?'is-positive':'is-negative'}>{signed(metrics.totalPnlQuote,instrument.symbol)}</strong><small>{signed(metrics.realizedPnlQuote,instrument.symbol)} realized</small></div>
    </div>
    <div className="db-paper-grid">
      <article className="db-paper-market">
        <div className="db-thesis-company"><StockIcon ticker={instrument.ticker} size={46}/><div><strong>{instrument.companyName} thesis lab</strong><span>{thesisSymbol} / {instrument.symbol} · paper market</span></div><span className="db-paper-badge">Simulated</span></div>
        <div className="db-paper-price"><span>Current thesis price</span><strong>{format(metrics.spotPrice,6)} {instrument.symbol}</strong><small>Curve price rises when people back the thesis and falls when they sell.</small></div>
        <div className="db-thesis-trade-tabs"><button aria-pressed={direction==='buy'} onClick={()=>setDirection('buy')}>Back</button><button aria-pressed={direction==='sell'} onClick={()=>setDirection('sell')}>Sell</button></div>
        <label className="db-thesis-amount"><span>You {direction==='buy'?'spend':'sell'}</span><div><input inputMode="decimal" value={amount} onChange={event=>{setAmount(event.target.value);setQuote(null);setError('')}} placeholder="0.00" aria-label={`Paper amount in ${direction==='buy'?instrument.symbol:thesisSymbol}`}/><strong>{direction==='buy'?instrument.symbol:thesisSymbol}</strong></div></label>
        {quote?<div className="db-thesis-quote-review"><dl><div><dt>You receive</dt><dd>{format(quote.outputAmount)} {direction==='buy'?thesisSymbol:instrument.symbol}</dd></div><div><dt>Trading fee</dt><dd>{format(quote.feeAmount)} {direction==='buy'?instrument.symbol:thesisSymbol}</dd></div><div><dt>Price impact</dt><dd>{format(quote.priceImpactPct,2)}%</dd></div><div><dt>Wallet signature</dt><dd>None</dd></div></dl><button className="db-button db-blue-button" onClick={execute}><Beaker size={16}/> Execute paper trade</button></div>:<button className="db-button db-blue-button" disabled={!amount} onClick={preview}><ArrowRight size={16}/> Preview paper trade</button>}
        {error&&<p className="db-thesis-error" role="alert">{error}</p>}
        <p className="db-paper-disclosure"><ShieldCheck size={15}/> Paper mode never constructs a transaction, connects a wallet, or moves stock tokens. Its {PAPER_FEE_BPS/100}% fee and curve illustrate the mechanics; live quotes come from the verified pool.</p>
      </article>
      <aside className="db-paper-learn">
        <span className="db-eyebrow">What is happening</span>
        <ol><li><strong>Choose the stock.</strong><span>The creator’s selected stock token is the quote asset.</span></li><li><strong>Back the thesis.</strong><span>You exchange {instrument.symbol} for {thesisSymbol}; increased demand moves the curve price up.</span></li><li><strong>Exit through the pair.</strong><span>Selling {thesisSymbol} returns {instrument.symbol} at the simulated curve price.</span></li></ol>
        <dl><div><dt>Average entry</dt><dd>{format(metrics.averageEntryPrice,6)} {instrument.symbol}</dd></div><div><dt>Unrealized P/L</dt><dd>{signed(metrics.unrealizedPnlQuote,instrument.symbol)}</dd></div><div><dt>Realized P/L</dt><dd>{signed(metrics.realizedPnlQuote,instrument.symbol)}</dd></div></dl>
      </aside>
    </div>
    <section className="db-paper-ledger"><div><span className="db-eyebrow">Paper activity</span><h3>Your practice trades</h3></div>{trades.length?<div>{trades.map((trade)=><article key={trade.id}><span className={trade.direction==='buy'?'is-buy':'is-sell'}>{trade.direction==='buy'?'Backed':'Sold'}</span><strong>{format(trade.inputAmount)} {trade.direction==='buy'?instrument.symbol:thesisSymbol}</strong><span>→ {format(trade.outputAmount)} {trade.direction==='buy'?thesisSymbol:instrument.symbol}</span><time>{new Date(trade.executedAt).toLocaleString()}</time></article>)}</div>:<p>No paper trades yet. Preview a trade to see the exact exchange before executing it.</p>}</section>
  </section>;
}
