'use client';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {tokenForTicker} from '@/lib/base/tokens';
import {ArrowLeft} from 'lucide-react';
import MemestockDetail,{type MemeTokenData} from './MemestockDetail';
import MemestockTable from './MemestockTable';

interface TrendingMeme extends MemeTokenData{parentTicker:string;parentSymbol:string}
interface Resp{tokens:TrendingMeme[];stale?:boolean;error?:string}

// The top-level Memestocks tab: one ranked feed across every Base stock.
export default function TrendingMemestocks(){
 const [sel,setSel]=useState<TrendingMeme|null>(null);
 const q=useQuery({queryKey:['memecoins-trending'],staleTime:3*60000,retry:false,
  queryFn:async({signal})=>{const r=await fetch('/api/memecoins/trending',{signal});const d=await r.json();if(!r.ok)throw Error('Unavailable');return d as Resp}});

 if(sel){const company=tokenForTicker(sel.parentTicker);return <section className="db-memestocks db-trending"><button className="db-text-link db-meme-back" onClick={()=>setSel(null)}><ArrowLeft size={15}/> All memestocks</button><MemestockDetail token={sel} pairedWith={sel.parentSymbol} companyName={company?.name||sel.parentTicker}/></section>;}

 return <section className="db-memestocks db-trending" data-reveal>
  <p className="db-small-note">Meme tokens trading against tokenized stocks on Base, ranked by 24h volume. Not the companies or their stocks — independent, speculative, high-risk.</p>
  {q.isPending&&<p role="status">Reading Base liquidity pools…</p>}
  {q.isError&&<p role="status">Trending data is temporarily unavailable.</p>}
  {q.data?.stale&&<p role="status" className="db-data-notice">Refresh unavailable. Showing previous results.</p>}
  {q.data&&q.data.tokens.length===0&&<p>No memestocks are active right now.</p>}
  {q.data&&q.data.tokens.length>0&&<MemestockTable rows={q.data.tokens} showStock onSelect={(r)=>setSel(r as TrendingMeme)}/>}</section>;
}
