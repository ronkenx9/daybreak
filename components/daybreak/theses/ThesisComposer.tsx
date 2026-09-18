'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleAlert, LoaderCircle, PenLine, ShieldCheck, WalletCards } from 'lucide-react';
import { authedFetch } from '@/lib/account/api-client';
import { useAccountState } from '../AccountProvider';
import { StockIcon } from '../Identity';
import type { ThesisInstrumentView, ThesisLaunchPreview } from './types';

interface Draft { instrumentId: string; title: string; summary: string; body: string; invalidation: string; horizon: string; sources: string[]; tokenName: string; tokenSymbol: string }
const blank: Draft = { instrumentId: '', title: '', summary: '', body: '', invalidation: '', horizon: '', sources: [''], tokenName: '', tokenSymbol: '' };

export default function ThesisComposer({ instruments, initialTicker, onClose, onPublished }: { instruments: ThesisInstrumentView[]; initialTicker?: string; onClose: () => void; onPublished: (slug: string) => void }) {
  const account = useAccountState();
  const first = instruments.find((item)=>item.ticker===initialTicker&&item.lifecycle.create) || instruments.find((item)=>item.lifecycle.create);
  const [step,setStep]=useState(1); const [draft,setDraft]=useState<Draft>(()=>({...blank,instrumentId:first?.id||''}));
  const [thesisId,setThesisId]=useState(''); const [preview,setPreview]=useState<ThesisLaunchPreview|null>(null);
  const [busy,setBusy]=useState<'preview'|'sign'|null>(null); const [error,setError]=useState('');
  const selected=useMemo(()=>instruments.find((item)=>item.id===draft.instrumentId),[draft.instrumentId,instruments]);
  const storageKey=`daybreak-thesis-draft:${account.user?.id||'guest'}`;
  useEffect(()=>{try{const saved=sessionStorage.getItem(storageKey);if(saved)setDraft({...blank,...JSON.parse(saved)});}catch{}},[storageKey]);
  useEffect(()=>{try{sessionStorage.setItem(storageKey,JSON.stringify(draft));}catch{}},[draft,storageKey]);
  const update=<K extends keyof Draft>(key:K,value:Draft[K])=>{setDraft((current)=>({...current,[key]:value}));setPreview(null);setError('')};
  const caseReady=draft.title.trim().length>=12&&draft.summary.trim().length>=24&&draft.body.trim().length>=80&&draft.invalidation.trim().length>=20&&draft.tokenName.trim().length>=2&&/^[A-Z0-9]{2,10}$/.test(draft.tokenSymbol);

  const choose=(instrument:ThesisInstrumentView)=>{if(!instrument.lifecycle.create)return;update('instrumentId',instrument.id);if(!draft.tokenName)update('tokenName',`${instrument.companyName} Thesis`.slice(0,32));if(!draft.tokenSymbol)update('tokenSymbol',`${instrument.ticker}TH`.slice(0,10));};
  const build=async()=>{if(!account.authenticated){account.login();return}setBusy('preview');setError('');try{
    const wallet=await account.ensureSolanaWallet();
    let id=thesisId;
    if(!id){const created=await authedFetch<{thesis:{id:string}}>('/api/theses',{method:'POST',body:JSON.stringify({...draft,sources:draft.sources.filter(Boolean)})});id=created.thesis.id;setThesisId(id)}
    const built=await authedFetch<ThesisLaunchPreview>(`/api/theses/${id}/preview`,{method:'POST',body:JSON.stringify({creator:wallet,idempotencyKey:crypto.randomUUID()})});setPreview(built);
  }catch(caught){setError(caught instanceof Error?caught.message:'Could not build market review')}finally{setBusy(null)}};
  const publish=async()=>{if(!preview)return;setBusy('sign');setError('');try{const signed=await account.signSolanaTransaction(preview.transactionBase64);const result=await authedFetch<{slug:string}>(`/api/theses/${preview.thesisId}/submit`,{method:'POST',body:JSON.stringify({signedTransaction:signed})});sessionStorage.removeItem(storageKey);onPublished(result.slug)}catch(caught){setError(caught instanceof Error?caught.message:'Could not publish thesis')}finally{setBusy(null)}};

  return <section className="db-thesis-composer">
    <div className="db-thesis-composer-top"><button className="db-text-link" onClick={onClose}><ArrowLeft size={15}/> Back</button><div className="db-thesis-steps" aria-label="Creation progress">{[1,2,3].map((number)=><span key={number} className={number===step?'active':number<step?'done':''}>{number<step?<Check size={13}/>:number}</span>)}</div></div>
    <header><span className="db-eyebrow">Create a thesis · Step {step} of 3</span><h2>{step===1?'Choose the stock token.':step===2?'Make your case.':'Review the market.'}</h2><p>{step===1?'Each thesis is paired directly with one exact stock token.':step===2?'Write the argument people will assess before they back it.':'Check the immutable thesis and onchain terms before signing.'}</p></header>
    {step===1&&<div className="db-thesis-instrument-grid">{instruments.map((instrument)=><button key={instrument.id} disabled={!instrument.lifecycle.create} aria-pressed={draft.instrumentId===instrument.id} onClick={()=>choose(instrument)}><StockIcon ticker={instrument.ticker} size={42}/><span><strong>{instrument.companyName}</strong><small>{instrument.symbol} · Solana</small></span>{instrument.lifecycle.create?<em>Creation verified</em>:<em>Verification pending</em>}</button>)}</div>}
    {step===2&&<div className="db-thesis-fields">
      <label>Thesis title<input value={draft.title} maxLength={120} onChange={e=>update('title',e.target.value)} placeholder="Apple's services business will drive its next phase"/></label>
      <label>Short case<textarea value={draft.summary} maxLength={280} onChange={e=>update('summary',e.target.value)} placeholder="The argument in two or three clear sentences."/></label>
      <label>Full reasoning<textarea className="is-long" value={draft.body} maxLength={5000} onChange={e=>update('body',e.target.value)} placeholder="Explain the evidence, mechanism and risks."/></label>
      <label>What would change your mind?<textarea value={draft.invalidation} maxLength={600} onChange={e=>update('invalidation',e.target.value)} placeholder="Name the evidence that would invalidate the thesis."/></label>
      <div className="db-thesis-field-pair"><label>Time horizon<input value={draft.horizon} maxLength={80} onChange={e=>update('horizon',e.target.value)} placeholder="12–24 months"/></label><label>Evidence URL<input value={draft.sources[0]||''} onChange={e=>update('sources',[e.target.value])} placeholder="https://…"/></label></div>
      <div className="db-thesis-field-pair"><label>Token name<input value={draft.tokenName} maxLength={32} onChange={e=>update('tokenName',e.target.value)} /></label><label>Token symbol<input value={draft.tokenSymbol} maxLength={10} onChange={e=>update('tokenSymbol',e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}/></label></div>
    </div>}
    {step===3&&<div className="db-thesis-review-layout"><article className="db-thesis-review-copy"><div className="db-thesis-company"><StockIcon ticker={selected?.ticker||'AAPL'} size={42}/><div><strong>{selected?.companyName}</strong><span>{draft.tokenSymbol} / {selected?.symbol}</span></div></div><h3>{draft.title}</h3><p>{draft.summary}</p><section><span className="db-eyebrow">What would change my mind</span><p>{draft.invalidation}</p></section></article><aside className="db-thesis-review-terms"><span className="db-eyebrow">Onchain terms</span>{preview?<><dl><div><dt>Pair</dt><dd>{preview.instrument.symbol}</dd></div><div><dt>Supply</dt><dd>Dynamic</dd></div><div><dt>Opening fee</dt><dd>{preview.terms.startingFeeBps/100}%</dd></div><div><dt>Settled fee</dt><dd>{preview.terms.endingFeeBps/100}%</dd></div><div><dt>Graduated liquidity</dt><dd>{preview.terms.migratedLiquidityPermanentLockedPct}% locked</dd></div><div><dt>Pool</dt><dd>{preview.poolAddress.slice(0,6)}…{preview.poolAddress.slice(-5)}</dd></div></dl><div className="db-thesis-sign-note"><ShieldCheck size={16}/><p>Your wallet creates this exact market. The original thesis and pair become permanent after confirmation.</p></div><button className="db-button db-blue-button" disabled={busy==='sign'} onClick={publish}>{busy==='sign'?<LoaderCircle className="db-spin" size={17}/>:<WalletCards size={17}/>} {busy==='sign'?'Waiting for signature…':'Sign & publish'}</button></>:<><p>Build the transaction to see its exact pool, fees and lock terms. Nothing is signed or sent during review.</p><button className="db-button db-blue-button" disabled={busy==='preview'} onClick={build}>{busy==='preview'?<LoaderCircle className="db-spin" size={17}/>:<PenLine size={17}/>} {busy==='preview'?'Building review…':'Build market review'}</button></>}</aside></div>}
    {error&&<p className="db-thesis-error" role="alert"><CircleAlert size={15}/>{error}</p>}
    {!preview&&<footer><button className="db-text-link" disabled={step===1} onClick={()=>setStep((value)=>Math.max(1,value-1))}>Back</button><button className="db-button db-blue-button" disabled={(step===1&&!selected?.lifecycle.create)||(step===2&&!caseReady)||step===3} onClick={()=>setStep((value)=>Math.min(3,value+1))}>Continue <ArrowRight size={16}/></button></footer>}
  </section>;
}
