'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, CircleAlert, LoaderCircle, ShieldCheck, WalletCards } from 'lucide-react';
import { authedFetch } from '@/lib/account/api-client';
import { useAccountState } from '../AccountProvider';
import type { ThesisInstrumentView, ThesisTradeReview, ThesisView } from './types';

export default function ThesisTradePanel({ thesis, instrument }: { thesis: ThesisView; instrument?: ThesisInstrumentView }) {
  const account = useAccountState();
  const [direction,setDirection]=useState<'buy'|'sell'>('buy'); const [amount,setAmount]=useState('');
  const [review,setReview]=useState<ThesisTradeReview|null>(null); const [busy,setBusy]=useState<'quote'|'sign'|null>(null);
  const [error,setError]=useState(''); const [receipt,setReceipt]=useState('');
  useEffect(()=>{setReview(null);setError('');setReceipt('')},[direction,amount]);
  const inputSymbol=direction==='buy'?instrument?.symbol:thesis.tokenSymbol;
  const canTrade=Boolean(instrument?.lifecycle[direction]&&thesis.marketStatus==='active');
  const quote=async()=>{if(!account.authenticated){account.login();return}setBusy('quote');setError('');try{const wallet=await account.ensureSolanaWallet();const next=await authedFetch<ThesisTradeReview>(`/api/theses/${thesis.id}/quote`,{method:'POST',body:JSON.stringify({wallet,direction,amount,slippageBps:100,idempotencyKey:crypto.randomUUID()})});setReview(next)}catch(caught){setError(caught instanceof Error?caught.message:'Quote unavailable')}finally{setBusy(null)}};
  const submit=async()=>{if(!review)return;setBusy('sign');setError('');try{const signed=await account.signSolanaTransaction(review.transactionBase64);const result=await authedFetch<{status:string;signature:string}>(`/api/theses/${thesis.id}/trade`,{method:'POST',body:JSON.stringify({quoteId:review.quoteId,signedTransaction:signed})});setReceipt(result.signature);setReview(null);setAmount('')}catch(caught){setError(caught instanceof Error?caught.message:'Trade could not be submitted')}finally{setBusy(null)}};
  return <aside className="db-thesis-trade-panel">
    <div className="db-thesis-trade-tabs"><button aria-pressed={direction==='buy'} onClick={()=>setDirection('buy')}>Back</button><button aria-pressed={direction==='sell'} onClick={()=>setDirection('sell')}>Sell</button></div>
    <span className="db-eyebrow">Paired with {instrument?.symbol || 'stock token'}</span><h2>{thesis.tokenSymbol} / {instrument?.symbol || 'stock token'}</h2>
    {!canTrade?<><p>Trading is unavailable until this exact stock-token pair passes its current lifecycle checks.</p><button className="db-button db-blue-button" disabled>Market unavailable</button></>:<>
      <label className="db-thesis-amount"><span>You {direction==='buy'?'pay':'sell'}</span><div><input inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)} placeholder="0.00" aria-label={`Amount in ${inputSymbol}`}/><strong>{inputSymbol}</strong></div></label>
      {review?<div className="db-thesis-quote-review"><dl><div><dt>You receive</dt><dd>{review.expectedOutput.amount} {review.expectedOutput.symbol}</dd></div><div><dt>Minimum received</dt><dd>{review.minimumOutput.amount} {review.expectedOutput.symbol}</dd></div><div><dt>Slippage</dt><dd>{review.slippageBps/100}%</dd></div><div><dt>Quote expires</dt><dd>{new Date(review.expiresAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</dd></div></dl><p><ShieldCheck size={15}/> Your wallet will sign this exact pair, amount and minimum output.</p><button className="db-button db-blue-button" disabled={busy==='sign'} onClick={submit}>{busy==='sign'?<LoaderCircle className="db-spin" size={17}/>:<WalletCards size={17}/>} {busy==='sign'?'Waiting for signature…':direction==='buy'?'Confirm backing':'Confirm sale'}</button></div>:<button className="db-button db-blue-button" disabled={!amount||busy==='quote'} onClick={quote}>{busy==='quote'?<LoaderCircle className="db-spin" size={17}/>:<ArrowRight size={17}/>} {busy==='quote'?'Building review…':direction==='buy'?'Review backing':'Review sale'}</button>}
      {direction==='buy'&&<p className="db-thesis-trade-note">Backing exchanges {instrument?.symbol} for thesis tokens. The stock tokens you spend leave your wallet.</p>}
    </>}
    {error&&<p className="db-thesis-error" role="alert"><CircleAlert size={15}/>{error}</p>}
    {receipt&&<a className="db-text-link" target="_blank" rel="noreferrer" href={`https://solscan.io/tx/${receipt}`}>Trade confirmed <ArrowRight size={14}/></a>}
    <dl className="db-thesis-market-facts"><div><dt>Pool</dt><dd>{thesis.poolAddress.slice(0,6)}…{thesis.poolAddress.slice(-5)}</dd></div><div><dt>Supply</dt><dd>Dynamic</dd></div><div><dt>Graduated liquidity</dt><dd>100% locked</dd></div></dl>
  </aside>;
}
