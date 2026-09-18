'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Beaker, LoaderCircle, Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import { StockIcon } from '../Identity';
import { addPaperThesis, createPaperAccount, executePaperTrade, PAPER_FEE_BPS, paperPositionMetrics, quotePaperTrade, restorePaperAccount, type PaperAccount, type PaperDirection, type PaperQuote } from '@/lib/theses/paper';
import type { ThesisInstrumentView } from './types';

const STORAGE_KEY = 'daybreak:conviction:paper:v2';
const format = (value: number, maximumFractionDigits = 4) => new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
const signed = (value: number, symbol: string) => `${value >= 0 ? '+' : '−'}${format(Math.abs(value))} ${symbol}`;

export default function PaperTradingMode({ instruments, instrumentState, onClose }: { instruments: ThesisInstrumentView[]; instrumentState: 'loading'|'ready'|'error'; onClose: () => void }) {
  const available = useMemo(()=>instruments.filter((instrument)=>instrument.lifecycle.buy&&instrument.lifecycle.sell),[instruments]);
  const [account,setAccount]=useState<PaperAccount>(()=>createPaperAccount(available));
  const [activeThesisId,setActiveThesisId]=useState('');
  const [screen,setScreen]=useState<'trade'|'create'>('trade');
  const [direction,setDirection]=useState<PaperDirection>('buy');
  const [amount,setAmount]=useState('');
  const [quote,setQuote]=useState<PaperQuote|null>(null);
  const [error,setError]=useState('');
  const [hydrated,setHydrated]=useState(false);
  const [draft,setDraft]=useState({instrumentId:'',title:'',summary:'',tokenName:'',tokenSymbol:''});

  useEffect(()=>{
    if(!available.length)return;
    let restored=createPaperAccount(available);
    try { const stored=localStorage.getItem(STORAGE_KEY); restored=restorePaperAccount(stored?JSON.parse(stored):null,available); } catch { /* Start fresh. */ }
    setAccount(restored);
    setActiveThesisId(restored.theses[0]?.id??'');
    setScreen(restored.theses.length?'trade':'create');
    setDraft(current=>{const selected=available.find((item)=>item.id===current.instrumentId)??available[0];return {...current,instrumentId:selected.id,tokenName:current.tokenName||`${selected.companyName} Thesis`,tokenSymbol:current.tokenSymbol||`${selected.ticker}IDEA`}});
    setHydrated(true);
  },[available]);
  useEffect(()=>{if(hydrated&&available.length)localStorage.setItem(STORAGE_KEY,JSON.stringify(account))},[account,available.length,hydrated]);
  useEffect(()=>{setQuote(null);setError('');setAmount('')},[direction,activeThesisId]);

  const activeThesis=account.theses.find((thesis)=>thesis.id===activeThesisId)??account.theses[0];
  const instrument=available.find((item)=>item.id===activeThesis?.instrumentId);
  const metrics=activeThesis?paperPositionMetrics(account,activeThesis.id):null;
  const balance=instrument?account.stockBalances[instrument.id]??0:0;
  const trades=activeThesis?account.trades.filter((trade)=>trade.thesisId===activeThesis.id):[];
  const draftInstrument=available.find((item)=>item.id===draft.instrumentId)??available[0];

  const updateDraftInstrument=(instrumentId:string)=>{const selected=available.find((item)=>item.id===instrumentId);setDraft(current=>({...current,instrumentId,tokenSymbol:`${selected?.ticker??''}IDEA`,tokenName:`${selected?.companyName??''} Thesis`}))};
  const openCreator=()=>{const selected=instrument??draftInstrument;setError('');setDraft(current=>({...current,instrumentId:selected.id,tokenName:current.tokenName||`${selected.companyName} Thesis`,tokenSymbol:current.tokenSymbol||`${selected.ticker}IDEA`}));setScreen('create')};
  const createThesis=()=>{if(!draftInstrument)return;setError('');try{const id=crypto.randomUUID();const next=addPaperThesis(account,{id,instrumentId:draftInstrument.id,title:draft.title,summary:draft.summary,tokenName:draft.tokenName,tokenSymbol:draft.tokenSymbol,createdAt:new Date().toISOString()},available);setAccount(next);setActiveThesisId(id);setDraft({instrumentId:draftInstrument.id,title:'',summary:'',tokenName:'',tokenSymbol:''});setScreen('trade')}catch(caught){setError(caught instanceof Error?caught.message:'Paper thesis could not be created')}};
  const preview=()=>{if(!instrument||!activeThesis)return;setError('');try{const input=Number(amount);if(direction==='buy'&&input>balance)throw Error('Not enough paper stock tokens');if(direction==='sell'&&input>(metrics?.quantity??0))throw Error('Not enough paper thesis tokens');setQuote(quotePaperTrade(account.markets[activeThesis.id],direction,input))}catch(caught){setQuote(null);setError(caught instanceof Error?caught.message:'Paper quote unavailable')}};
  const execute=()=>{if(!activeThesis||!quote)return;try{setAccount(current=>executePaperTrade(current,activeThesis.id,direction,quote.inputAmount));setQuote(null);setAmount('');setError('')}catch(caught){setError(caught instanceof Error?caught.message:'Paper trade failed')}};
  const reset=()=>{if(!confirm('Reset every simulated thesis, balance, position and paper trade?'))return;setAccount(createPaperAccount(available));setActiveThesisId('');setScreen('create');setAmount('');setQuote(null);setError('')};

  if(!available.length)return <section className="db-paper-mode"><button className="db-text-link" onClick={onClose}><ArrowLeft size={15}/> Conviction</button>{instrumentState==='loading'?<div className="db-thesis-loading"><LoaderCircle className="db-spin" size={20}/> Preparing paper markets…</div>:<div className="db-thesis-empty"><Beaker size={26}/><h3>Paper mode is unavailable.</h3><p>The supported stock-token list could not be loaded.</p></div>}</section>;

  if(screen==='create'||!activeThesis||!instrument||!metrics)return <section className="db-paper-mode">
    <div className="db-paper-top"><button className="db-text-link" onClick={activeThesis?()=>{setError('');setScreen('trade')}:onClose}><ArrowLeft size={15}/> {activeThesis?'Paper portfolio':'Conviction'}</button><span className="db-paper-badge"><Beaker size={14}/> Simulation · no wallet</span></div>
    <div className="db-paper-create">
      <header><span className="db-eyebrow">Create a paper thesis</span><h2>Start with an idea.</h2><p>Choose the stock token your thesis will pair with, then define the argument and its paper token. Nothing is published or sent onchain.</p></header>
      <div className="db-paper-create-grid">
        <div className="db-thesis-fields">
          <label>Paired stock token<select value={draft.instrumentId||draftInstrument.id} onChange={event=>updateDraftInstrument(event.target.value)}>{available.map((item)=><option key={item.id} value={item.id}>{item.companyName} · {item.symbol}</option>)}</select></label>
          <label>Thesis title<input value={draft.title} maxLength={100} onChange={event=>setDraft(current=>({...current,title:event.target.value}))} placeholder="Apple services will drive its next growth cycle"/></label>
          <label>Why you believe it<textarea value={draft.summary} maxLength={280} onChange={event=>setDraft(current=>({...current,summary:event.target.value}))} placeholder="Write the specific case someone should assess before backing this thesis."/></label>
          <div className="db-thesis-field-pair"><label>Paper token name<input value={draft.tokenName} maxLength={32} onChange={event=>setDraft(current=>({...current,tokenName:event.target.value}))} placeholder={`${draftInstrument.companyName} Services Thesis`}/></label><label>Symbol<input value={draft.tokenSymbol} maxLength={10} onChange={event=>setDraft(current=>({...current,tokenSymbol:event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')}))} placeholder={`${draftInstrument.ticker}IDEA`}/></label></div>
          {error&&<p className="db-thesis-error" role="alert">{error}</p>}
          <button className="db-button db-blue-button" onClick={createThesis}><Beaker size={16}/> Create paper thesis</button>
        </div>
        <aside className="db-paper-create-review"><StockIcon ticker={draftInstrument.ticker} size={48}/><span className="db-paper-badge">Simulated pair</span><h3>{draft.title||'Your thesis title'}</h3><p>{draft.summary||'Your reasoning will appear here before anyone practices backing the idea.'}</p><dl><div><dt>Base token</dt><dd>{draft.tokenSymbol||`${draftInstrument.ticker}IDEA`}</dd></div><div><dt>Quote token</dt><dd>{draftInstrument.symbol}</dd></div><div><dt>Paper stock balance</dt><dd>{format(account.stockBalances[draftInstrument.id]??0)} {draftInstrument.symbol}</dd></div><div><dt>Wallet signature</dt><dd>None</dd></div></dl></aside>
      </div>
    </div>
  </section>;

  return <section className="db-paper-mode">
    <div className="db-paper-top"><button className="db-text-link" onClick={onClose}><ArrowLeft size={15}/> Conviction</button><div><button className="db-text-link" onClick={openCreator}><Plus size={14}/> New paper thesis</button><button className="db-text-link" onClick={reset}><RotateCcw size={14}/> Reset paper account</button></div></div>
    <header className="db-paper-head"><div><span className="db-paper-badge"><Beaker size={14}/> Simulation · no wallet</span><h2>Learn the pair by trading it.</h2><p>Practice exchanging a stock token for a thesis token. Every balance and result below is simulated and stored only in this browser.</p></div><label><span>Paper thesis</span><select value={activeThesis.id} onChange={event=>setActiveThesisId(event.target.value)}>{account.theses.map((thesis)=>{const item=available.find((candidate)=>candidate.id===thesis.instrumentId);return <option key={thesis.id} value={thesis.id}>{thesis.title} · {item?.symbol}</option>})}</select></label></header>
    <div className="db-paper-summary"><div><span>Paper stock balance</span><strong>{format(balance)} {instrument.symbol}</strong><small>Shared across {instrument.symbol} paper theses</small></div><div><span>Thesis position</span><strong>{format(metrics.quantity,2)} {activeThesis.tokenSymbol}</strong><small>Worth {format(metrics.marketValueQuote)} {instrument.symbol}</small></div><div><span>Total paper P/L</span><strong className={metrics.totalPnlQuote>=0?'is-positive':'is-negative'}>{signed(metrics.totalPnlQuote,instrument.symbol)}</strong><small>{signed(metrics.realizedPnlQuote,instrument.symbol)} realized</small></div></div>
    <div className="db-paper-grid">
      <article className="db-paper-market"><div className="db-thesis-company"><StockIcon ticker={instrument.ticker} size={46}/><div><strong>{activeThesis.title}</strong><span>{activeThesis.tokenSymbol} / {instrument.symbol} · paper market</span></div><span className="db-paper-badge">Simulated</span></div><p className="db-paper-thesis-summary">{activeThesis.summary}</p><div className="db-paper-price"><span>Current thesis price</span><strong>{format(metrics.spotPrice,6)} {instrument.symbol}</strong><small>Curve price rises when people back the thesis and falls when they sell.</small></div><div className="db-thesis-trade-tabs"><button aria-pressed={direction==='buy'} onClick={()=>setDirection('buy')}>Back</button><button aria-pressed={direction==='sell'} onClick={()=>setDirection('sell')}>Sell</button></div><label className="db-thesis-amount"><span>You {direction==='buy'?'spend':'sell'}</span><div><input inputMode="decimal" value={amount} onChange={event=>{setAmount(event.target.value);setQuote(null);setError('')}} placeholder="0.00" aria-label={`Paper amount in ${direction==='buy'?instrument.symbol:activeThesis.tokenSymbol}`}/><strong>{direction==='buy'?instrument.symbol:activeThesis.tokenSymbol}</strong></div></label>{quote?<div className="db-thesis-quote-review"><dl><div><dt>You receive</dt><dd>{format(quote.outputAmount)} {direction==='buy'?activeThesis.tokenSymbol:instrument.symbol}</dd></div><div><dt>Trading fee</dt><dd>{format(quote.feeAmount)} {direction==='buy'?instrument.symbol:activeThesis.tokenSymbol}</dd></div><div><dt>Price impact</dt><dd>{format(quote.priceImpactPct,2)}%</dd></div><div><dt>Wallet signature</dt><dd>None</dd></div></dl><button className="db-button db-blue-button" onClick={execute}><Beaker size={16}/> Execute paper trade</button></div>:<button className="db-button db-blue-button" disabled={!amount} onClick={preview}><ArrowRight size={16}/> Preview paper trade</button>}{error&&<p className="db-thesis-error" role="alert">{error}</p>}<p className="db-paper-disclosure"><ShieldCheck size={15}/> Paper mode never constructs a transaction, connects a wallet, publishes a thesis, or moves stock tokens. Its {PAPER_FEE_BPS/100}% fee and curve illustrate the mechanics; live quotes come from the verified pool.</p></article>
      <aside className="db-paper-learn"><span className="db-eyebrow">What is happening</span><ol><li><strong>Create the thesis.</strong><span>You paired a specific argument with {instrument.symbol}.</span></li><li><strong>Back the thesis.</strong><span>You exchange {instrument.symbol} for {activeThesis.tokenSymbol}; increased demand moves the curve price up.</span></li><li><strong>Exit through the pair.</strong><span>Selling {activeThesis.tokenSymbol} returns {instrument.symbol} at the simulated curve price.</span></li></ol><dl><div><dt>Average entry</dt><dd>{format(metrics.averageEntryPrice,6)} {instrument.symbol}</dd></div><div><dt>Unrealized P/L</dt><dd>{signed(metrics.unrealizedPnlQuote,instrument.symbol)}</dd></div><div><dt>Realized P/L</dt><dd>{signed(metrics.realizedPnlQuote,instrument.symbol)}</dd></div></dl></aside>
    </div>
    <section className="db-paper-ledger"><div><span className="db-eyebrow">Paper activity</span><h3>{activeThesis.tokenSymbol} practice trades</h3></div>{trades.length?<div>{trades.map((trade)=><article key={trade.id}><span className={trade.direction==='buy'?'is-buy':'is-sell'}>{trade.direction==='buy'?'Backed':'Sold'}</span><strong>{format(trade.inputAmount)} {trade.direction==='buy'?instrument.symbol:activeThesis.tokenSymbol}</strong><span>→ {format(trade.outputAmount)} {trade.direction==='buy'?activeThesis.tokenSymbol:instrument.symbol}</span><time>{new Date(trade.executedAt).toLocaleString()}</time></article>)}</div>:<p>No paper trades yet. Preview a trade to see the exact exchange before executing it.</p>}</section>
  </section>;
}
