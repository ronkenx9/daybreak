'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Avatar, StockIcon } from './Identity';

const communities = [
  { name: 'Built for tomorrow', stock: 'NVDA', score: 0, seed: 0, art: 'Ideas for the machines shaping what comes next.' },
  { name: 'Everything we watch', stock: 'META', score: 0, seed: 1, art: 'Stories, screens and the culture around them.' },
  { name: 'The everyday club', stock: 'AAPL', score: 0, seed: 2, art: 'Familiar products seen through a new lens.' },
];

export default function CommunitySpotlight({ compact = false }: { compact?: boolean }) {
  const [scores,setScores]=useState<Record<string,number>>({});
  useEffect(()=>{let alive=true;const refresh=()=>fetch('/api/muse/spotlight').then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(alive)setScores(Object.fromEntries(data.communities.map((c:{ticker:string;score:number})=>[c.ticker,c.score])));}).catch(()=>null);void refresh();const timer=setInterval(()=>void refresh(),30000);return()=>{alive=false;clearInterval(timer);};},[]);
  return <section className={`db-spotlight${compact ? ' is-compact' : ''}`} data-reveal>
    <div className="db-spotlight-head">
      <div><span className="db-micro">Community Spotlight</span><h2>Make something that belongs.</h2><p>Create with a community’s visual world. Every eligible paid or sponsored creation adds one Spotlight point for 24 hours.</p></div>
      <Link href="/app/groups" className="db-text-link">Find your circle <ArrowRight size={17}/></Link>
    </div>
    <div className="db-spotlight-grid">
      {[...communities].sort((a,b)=>(scores[b.stock]||0)-(scores[a.stock]||0)).map((item) => <article key={item.name} className="db-spotlight-card">
        <div className="db-spotlight-art"><Avatar seed={item.seed} size={compact ? 92 : 128}/><StockIcon ticker={item.stock} size={compact ? 38 : 48}/></div>
        <div className="db-spotlight-copy"><span>{item.stock} circle</span><h3>{item.name}</h3><p>{item.art}</p></div>
        <div className="db-spotlight-score"><strong>{scores[item.stock]||0}</strong><span>live points</span></div>
        <Link href={`/app/create?stock=${item.stock}`} className="db-button db-spotlight-action"><Sparkles size={16}/> Create with this community</Link>
      </article>)}
    </div>
    <p className="db-spotlight-note">Spotlight is a promotional creative-activity board. Scores do not measure investment quality or expected returns. Live scoring activates with the first settled Muse generation.</p>
  </section>;
}
