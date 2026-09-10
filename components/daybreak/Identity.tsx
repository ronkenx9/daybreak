'use client';
import Link from 'next/link';
import Image from 'next/image';
import {useEffect,useRef} from 'react';
export function BrandMark({size=30}:{size?:number}){return <svg className="db-brand-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"><path className="db-brand-mark-primary" d="M14 4h26c6.627 0 12 5.373 12 12v2L18 52h-4C7.373 52 2 46.627 2 40V16C2 9.373 7.373 4 14 4Z"/><path className="db-brand-mark-secondary" d="M60 18v30c0 6.627-5.373 12-12 12H18l42-42Z"/></svg>}
export function Wordmark({light=false}:{light?:boolean}){return <Link href="/" aria-label="Daybreak home" className={`db-wordmark ${light?'is-light':''}`}><BrandMark/><span>daybreak</span></Link>}
export const HEADWEAR=[
 {id:'midnight',name:'Midnight trapper',stock:'AAPL · NVDA'},
 {id:'cloud',name:'Cloud trapper',stock:'MSFT'},
 {id:'electric',name:'Electric trapper',stock:'AMZN'},
 {id:'racer',name:'Racer bucket',stock:'TSLA'},
 {id:'orbit',name:'Orbit beanie',stock:'INTC'},
 {id:'afterhours',name:'Afterhours cap',stock:'COIN'},
] as const;
export function Avatar({seed=0,size=48,label}:{seed?:number;size?:number;label?:string}){const n=((seed%HEADWEAR.length)+HEADWEAR.length)%HEADWEAR.length;return <span role={label?'img':undefined} aria-label={label} aria-hidden={!label} className="db-avatar db-plush-avatar" style={{width:size,height:size}}><Image src={`/assets/characters/${HEADWEAR[n].id}.png`} alt="" width={size} height={size} sizes={`${size}px`}/></span>}
export function CharacterCrew({className=''}:{className?:string}){
 const crew=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const root=crew.current;if(!root)return;
  const finePointer=window.matchMedia('(hover:hover) and (pointer:fine)');
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,lastX=0,lastY=0;
  const reset=()=>{root.removeAttribute('data-tracking');for(let i=0;i<3;i++){root.style.setProperty(`--crew-x-${i}`,'0px');root.style.setProperty(`--crew-y-${i}`,'0px')}root.style.setProperty('--crew-rx','0deg');root.style.setProperty('--crew-ry','0deg')};
  const render=()=>{
   frame=0;
   if(!finePointer.matches||reducedMotion.matches||document.documentElement.getAttribute('data-reduce-motion')==='true'){reset();return}
   const box=root.getBoundingClientRect();
   const x=Math.max(-1,Math.min(1,(lastX-(box.left+box.width/2))/(box.width*.62)));
   const y=Math.max(-1,Math.min(1,(lastY-(box.top+box.height/2))/(Math.max(box.height,240)*.72)));
   const depth=[10,19,13];
   depth.forEach((amount,i)=>{root.style.setProperty(`--crew-x-${i}`,`${(x*amount).toFixed(2)}px`);root.style.setProperty(`--crew-y-${i}`,`${(y*amount*.55).toFixed(2)}px`)});
   root.style.setProperty('--crew-rx',`${(-y*4).toFixed(2)}deg`);
   root.style.setProperty('--crew-ry',`${(x*6).toFixed(2)}deg`);
   root.setAttribute('data-tracking','true');
  };
  const move=(event:PointerEvent)=>{if(event.pointerType==='touch')return;lastX=event.clientX;lastY=event.clientY;if(!frame)frame=requestAnimationFrame(render)};
  const leave=(event:PointerEvent)=>{if(!event.relatedTarget)reset()};
  window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointerout',leave);window.addEventListener('blur',reset);
  return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerout',leave);window.removeEventListener('blur',reset);if(frame)cancelAnimationFrame(frame)};
 },[]);
 return <div ref={crew} className={`db-character-crew ${className}`} aria-hidden="true">{[0,1,2].map(seed=><div key={seed}><Avatar seed={seed} size={360}/></div>)}</div>
}
// Only these tickers ship a logo SVG. For every other tokenized name we draw a
// two-letter monogram — deciding up front avoids the broken-image flash you get
// from an SSR <img> that 404s before React can attach an onError handler.
const LOGO_TICKERS=new Set(['AAPL','AMZN','NFLX','NVDA','SBUX','SONY','GOOGL','TSLA','META','MSFT','COIN','INTC','SPCX','CRCL','MSTR']);
export function StockIcon({ticker,size=44}:{ticker:string;size?:number}){const hasLogo=LOGO_TICKERS.has(ticker);return <span className={`db-token db-token-${ticker}`} style={{width:size,height:size}}>{hasLogo?<img src={`/assets/stock/${ticker}.svg`} alt={`${ticker} logo`} width={size*.54} height={size*.54}/>:<span className="db-token-mono" style={{fontSize:size*.34}}>{ticker.slice(0,2)}</span>}</span>}
export function AvatarStack(){return <span className="db-avatar-stack" aria-label="Illustrated community avatars">{[0,1,2,3].map(i=><Avatar key={i} seed={i} size={36}/>)}</span>}
// Product-boundary badge: makes a tokenized stock, a community token, a meme and
// a plain company visually distinct at a glance (see product boundaries §3).
// A stock/company charm expresses taste; it never implies a holding.
const BADGE={
 stock:{label:'Tokenized stock',sub:'Base 8453'},
 community:{label:'Community token',sub:'Independent'},
 meme:{label:'Community meme',sub:'Speculative'},
 company:{label:'Company',sub:''},
} as const;
export function TypeBadge({kind}:{kind:keyof typeof BADGE}){const b=BADGE[kind];return <span className={`db-type-badge is-${kind}`} title={`${b.label}${b.sub?` · ${b.sub}`:''}`}><span className="db-type-dot" aria-hidden="true"/>{b.label}{b.sub&&<small>· {b.sub}</small>}</span>}
