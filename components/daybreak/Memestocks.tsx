'use client';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {tokenForTicker} from '@/lib/base/tokens';
import {ArrowLeft} from 'lucide-react';
import MemestockDetail,{type MemeTokenData} from './MemestockDetail';

interface Resp{ticker:string;tokens:MemeTokenData[];disclaimer:string;error?:string}
const usd0=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});

// Memestocks paired against one stock (shown inside that stock's detail).
export default function Memestocks({ticker}:{ticker:string}){
 const tok=tokenForTicker(ticker);
 const [sel,setSel]=useState<MemeTokenData|null>(null);
 const q=useQuery({queryKey:['memecoins',ticker],enabled:!!tok,staleTime:3*60000,retry:false,
  queryFn:async({signal})=>{const r=await fetch(`/api/memecoins?ticker=${encodeURIComponent(ticker)}`,{signal});const d=await r.json();if(!r.ok)throw Error(d.error||'Unavailable');return d as Resp}});

 if(!tok) return <section className="db-memestocks"><p className="db-small-note">Memestocks pair against a tokenized stock. {ticker} isn’t tokenized on Base yet, so there’s nothing to pair against.</p></section>;
 if(sel) return <section className="db-memestocks"><button className="db-text-link db-meme-back" onClick={()=>setSel(null)}><ArrowLeft size={15}/> All memestocks</button><MemestockDetail token={sel} pairedWith={tok.onchainSymbol} companyName={tok.name}/></section>;

 return <section className="db-memestocks"><div className="db-section-heading"><h3>Community memestocks</h3><button className="db-text-link" disabled={q.isFetching} onClick={()=>void q.refetch()}>{q.isFetching?'Loading…':'Refresh'}</button></div>
  <p className="db-small-note">Meme tokens that paired liquidity against {tok.onchainSymbol} on Base. Not {tok.name} or its stock — independent, speculative, high-risk.</p>
  {q.isPending&&<p role="status">Reading Base liquidity pools…</p>}
  {q.isError&&<p role="status">Memestock data is temporarily unavailable.</p>}
  {q.data&&q.data.tokens.length===0&&<p>No community tokens are paired with {tok.onchainSymbol} yet.</p>}
  <div className="db-meme-list">{q.data?.tokens.map(t=><button key={t.address} className="db-meme-row" onClick={()=>setSel(t)}><span className="db-token-mono db-meme-mono">{t.symbol.slice(0,2)}</span><span className="db-meme-main"><strong>{t.name||t.symbol}</strong><small>{t.symbol}{t.lowLiquidity?' · low liquidity':''}</small></span><span className="db-meme-val"><strong>{usd0(t.volume24Usd)}</strong><small>24h vol</small></span></button>)}</div></section>;
}
