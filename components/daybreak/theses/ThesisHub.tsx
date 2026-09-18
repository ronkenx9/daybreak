'use client';
import { useEffect, useMemo, useState } from 'react';
import { Beaker, BookOpenText, LoaderCircle, Plus, Search, ShieldCheck } from 'lucide-react';
import PaperTradingMode from './PaperTradingMode';
import ThesisCard from './ThesisCard';
import ThesisComposer from './ThesisComposer';
import ThesisDetail from './ThesisDetail';
import type { ThesisInstrumentView, ThesisView } from './types';

export default function ThesisHub() {
  const [instruments,setInstruments]=useState<ThesisInstrumentView[]>([]); const [items,setItems]=useState<ThesisView[]>([]);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading'); const [mode,setMode]=useState<'feed'|'create'|'detail'|'paper'>('feed');
  const [active,setActive]=useState<ThesisView|null>(null); const [query,setQuery]=useState('');
  const [paperSeed,setPaperSeed]=useState<ThesisView|null>(null);
  const [tab,setTab]=useState<'all'|'paper'|'live'>('all');
  useEffect(()=>{const controller=new AbortController();Promise.all([fetch('/api/theses',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}),fetch('/api/theses/instruments',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json()})]).then(([theses,available])=>{const next=theses.items||[];setItems(next);setInstruments(available.items||[]);setState('ready');const params=new URLSearchParams(location.search);const requested=params.get('thesis');const found=next.find((item:ThesisView)=>item.id===requested||item.slug===requested);if(found){setActive(found);if(found.mode==='paper'&&params.get('simulate')==='1'){setPaperSeed(found);setMode('paper')}else setMode('detail')}}).catch((error)=>{if(error?.name!=='AbortError')setState('error')});return()=>controller.abort()},[]);
  const filtered=useMemo(()=>{const needle=query.trim().toLowerCase();return items.filter(item=>(tab==='all'||item.mode===tab)&&(!needle||[item.title,item.summary,item.companyId,item.tokenSymbol].some(value=>value.toLowerCase().includes(needle))))},[items,query,tab]);
  const instrumentFor=(thesis:ThesisView)=>instruments.find((instrument)=>instrument.id===thesis.instrumentId);
  if(mode==='create')return <ThesisComposer instruments={instruments} initialTicker={new URLSearchParams(typeof location==='undefined'?'':location.search).get('stock')||undefined} onClose={()=>setMode('feed')} onPublished={(slug)=>{location.href=`/theses/${slug}`}}/>;
  if(mode==='paper')return <PaperTradingMode instruments={instruments} instrumentState={state} initialThesis={paperSeed} onPublished={(thesis)=>{setItems(current=>[thesis,...current.filter(item=>item.id!==thesis.id)]);setPaperSeed(thesis)}} onClose={()=>{setPaperSeed(null);setMode('feed')}}/>;
  if(mode==='detail'&&active)return <ThesisDetail thesis={active} instrument={instrumentFor(active)} onSimulate={active.mode==='paper'?()=>{setPaperSeed(active);setMode('paper')}:undefined} onBack={()=>{setActive(null);setMode('feed')}}/>;
  return <section className="db-thesis-hub">
    <header className="db-thesis-hub-head"><div><span className="db-eyebrow">Stock-paired thesis markets</span><h2>Ideas worth backing.</h2><p>Discover public paper markets and live stock-token pairs in one Conviction feed.</p></div><div className="db-thesis-head-actions"><button className="db-button" onClick={()=>{setPaperSeed(null);setMode('paper')}}><Beaker size={17}/> Create paper thesis</button><button className="db-button db-blue-button" onClick={()=>setMode('create')}><Plus size={17}/> Launch live thesis</button></div></header>
    <div className="db-thesis-toolbar"><label><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search theses or companies" aria-label="Search theses or companies"/></label><div className="db-thesis-tabs">{([['all','All'],['paper','Paper'],['live','Live']] as const).map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</div></div>
    {state==='loading'?<div className="db-thesis-loading"><LoaderCircle className="db-spin" size={20}/> Loading thesis markets…</div>:state==='error'?<div className="db-thesis-empty"><ShieldCheck size={26}/><h3>Thesis markets are unavailable.</h3><p>Your stocks and Circles are still available. Try this section again shortly.</p></div>:filtered.length?<div className="db-thesis-grid">{filtered.map((thesis)=><ThesisCard key={thesis.id} thesis={thesis} instrument={instrumentFor(thesis)} onOpen={()=>{setActive(thesis);setMode('detail')}} onSimulate={thesis.mode==='paper'?()=>{setPaperSeed(thesis);setMode('paper')}:undefined}/>)}</div>:<div className="db-thesis-empty"><BookOpenText size={28}/><h3>{query?'No thesis matches that search.':`No ${tab==='all'?'public':tab} theses yet.`}</h3><p>{query?'Try a company name, ticker or idea.':'Publish the first stock-paired idea for everyone to assess.'}</p>{!query&&<div className="db-thesis-empty-actions"><button className="db-button" onClick={()=>{setPaperSeed(null);setMode('paper')}}><Beaker size={16}/> Create paper thesis</button><button className="db-button db-blue-button" onClick={()=>setMode('create')}>Launch live thesis</button></div>}</div>}
    <aside className="db-thesis-method"><ShieldCheck size={18}/><div><strong>One feed, clear market types.</strong><p>Paper markets expose the shared simulation and public P/L. Live markets expose the exact stock-token mint, lifecycle and signing terms.</p></div></aside>
  </section>;
}
