'use client';
import { useEffect, useState } from 'react';
import { Beaker, BookOpenText, LoaderCircle, Plus, Search, ShieldCheck } from 'lucide-react';
import PaperTradingMode from './PaperTradingMode';
import XLayerConviction from './XLayerConviction';
import ThesisCard from './ThesisCard';
import ThesisComposer from './ThesisComposer';
import ThesisDetail from './ThesisDetail';
import type { ThesisInstrumentView, ThesisView } from './types';
import { paperDiscoveryAfterPublish } from '@/lib/theses/paper-pending';

export default function ThesisHub() {
  const [instruments,setInstruments]=useState<ThesisInstrumentView[]>([]); const [items,setItems]=useState<ThesisView[]>([]);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading'); const [mode,setMode]=useState<'feed'|'create'|'detail'|'paper'>('feed');
  const [active,setActive]=useState<ThesisView|null>(null); const [query,setQuery]=useState('');
  const [paperSeed,setPaperSeed]=useState<ThesisView|null>(null);
  const [tab,setTab]=useState<'all'|'paper'|'live'>('all');
  const [actor,setActor]=useState<'all'|'human'|'agent'>('all');
  const [instrumentState,setInstrumentState]=useState<'loading'|'ready'|'error'>('loading');
  const [page,setPage]=useState(0); const [hasMore,setHasMore]=useState(false);
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{const controller=new AbortController();fetch('/api/theses/instruments',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{setInstruments(data.items||[]);setInstrumentState('ready')}).catch(error=>{if(error?.name!=='AbortError')setInstrumentState('error')});return()=>controller.abort()},[]);
  useEffect(()=>{const params=new URLSearchParams(location.search);const ticker=params.get('stock')?.toUpperCase();if(ticker){const instrument=instruments.find(item=>item.ticker===ticker);if(instrument){setQuery(instrument.companyId);setPage(0)}}if(params.get('create')==='paper')setMode('paper')},[instruments]);
  useEffect(()=>{const controller=new AbortController();setState('loading');const params=new URLSearchParams({mode:tab,actor,q:query,page:String(page)});const timer=setTimeout(()=>{fetch(`/api/theses?${params}`,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{setItems(data.items||[]);setHasMore(!!data.hasMore);setState('ready')}).catch(error=>{if(error?.name!=='AbortError')setState('error')})},200);return()=>{clearTimeout(timer);controller.abort()}},[tab,actor,query,page,refresh]);
  useEffect(()=>{const requested=new URLSearchParams(location.search).get('thesis');if(!requested)return;const controller=new AbortController();fetch(`/api/theses/${encodeURIComponent(requested)}`,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(({thesis})=>{setActive(thesis);if(thesis.mode==='paper'&&new URLSearchParams(location.search).get('simulate')==='1'){setPaperSeed(thesis);setMode('paper')}else setMode('detail')}).catch(error=>{if(error?.name!=='AbortError')setState('error')});return()=>controller.abort()},[]);
  const filtered=items;
  const instrumentFor=(thesis:ThesisView)=>instruments.find((instrument)=>instrument.id===thesis.instrumentId);
  if(mode==='create')return <ThesisComposer instruments={instruments} initialTicker={new URLSearchParams(typeof location==='undefined'?'':location.search).get('stock')||undefined} onClose={()=>setMode('feed')} onPublished={(slug)=>{location.href=`/theses/${slug}`}}/>;
  if(mode==='paper')return <PaperTradingMode instruments={instruments} instrumentState={instrumentState} initialThesis={paperSeed} initialTicker={new URLSearchParams(typeof location==='undefined'?'':location.search).get('stock')||undefined} onPublished={(thesis)=>{const next=paperDiscoveryAfterPublish();setTab(next.tab);setQuery(next.query);setPage(next.page);setRefresh(value=>value+1);setPaperSeed(thesis)}} onClose={()=>{setPaperSeed(null);setMode('feed')}}/>;
  if(mode==='detail'&&active)return <ThesisDetail thesis={active} instrument={instrumentFor(active)} onSimulate={active.mode==='paper'?()=>{setPaperSeed(active);setMode('paper')}:undefined} onBack={()=>{setActive(null);setMode('feed')}}/>;
  return <section className="db-thesis-hub">
    <header className="db-thesis-hub-head"><div><span className="db-eyebrow">Stock-paired thesis markets</span><h2>Ideas worth backing.</h2><p>Discover public paper markets and live stock-token pairs in one Conviction feed.</p></div><div className="db-thesis-head-actions"><button className="db-button" onClick={()=>{setPaperSeed(null);setMode('paper')}}><Beaker size={17}/> Create paper thesis</button><button className="db-button db-blue-button" onClick={()=>setMode('create')}><Plus size={17}/> Launch live thesis</button></div></header>
    <XLayerConviction/>
    <div className="db-thesis-toolbar"><label><Search size={16}/><input value={query} onChange={event=>{setQuery(event.target.value);setPage(0)}} placeholder="Search theses or companies" aria-label="Search theses or companies"/></label><div className="db-thesis-tabs">{([['all','All'],['paper','Paper'],['live','Live']] as const).map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setPage(0)}}>{label}</button>)}</div><div className="db-thesis-tabs" aria-label="Author type">{([['all','Everyone'],['human','People'],['agent','Agents']] as const).map(([id,label])=><button key={id} aria-pressed={actor===id} onClick={()=>{setActor(id);setPage(0)}}>{label}</button>)}</div></div>
    {state==='loading'?<div className="db-thesis-loading"><LoaderCircle className="db-spin" size={20}/> Loading thesis markets…</div>:state==='error'?<div className="db-thesis-empty"><ShieldCheck size={26}/><h3>Thesis markets are unavailable.</h3><p>Your stocks and Circles are still available. Try this section again shortly.</p></div>:filtered.length?<div className="db-thesis-grid">{filtered.map((thesis)=><ThesisCard key={thesis.id} thesis={thesis} instrument={instrumentFor(thesis)} onOpen={()=>{setActive(thesis);setMode('detail')}} onSimulate={thesis.mode==='paper'?()=>{setPaperSeed(thesis);setMode('paper')}:undefined}/>)}</div>:<div className="db-thesis-empty"><BookOpenText size={28}/><h3>{query?'No thesis matches that search.':`No ${tab==='all'?'public':tab} theses yet.`}</h3><p>{query?'Try a company name, ticker or idea.':'Publish the first stock-paired idea for everyone to assess.'}</p>{!query&&<div className="db-thesis-empty-actions"><button className="db-button" onClick={()=>{setPaperSeed(null);setMode('paper')}}><Beaker size={16}/> Create paper thesis</button><button className="db-button db-blue-button" onClick={()=>setMode('create')}>Launch live thesis</button></div>}</div>}
    <nav aria-label="Market pages">{page>0&&<button className="db-button" onClick={()=>setPage(page-1)}>Previous</button>}{hasMore&&<button className="db-button" onClick={()=>setPage(page+1)}>Next markets</button>}</nav>
    <aside className="db-thesis-method"><ShieldCheck size={18}/><div><strong>One feed, clear market types.</strong><p>Paper markets expose the shared simulation and public P/L. Live markets expose the exact stock-token mint, lifecycle and signing terms.</p></div></aside>
  </section>;
}
