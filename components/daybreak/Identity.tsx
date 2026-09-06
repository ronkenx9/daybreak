'use client';
import Link from 'next/link';
import Image from 'next/image';
export function Wordmark({light=false}:{light?:boolean}){return <Link href="/" aria-label="Daybreak home" className={`db-wordmark ${light?'is-light':''}`}>daybreak<span className="db-logo-sun" aria-hidden="true">✳</span></Link>}
export const HEADWEAR=[
 {id:'midnight',name:'Midnight trapper',stock:'AAPL · NVDA'},
 {id:'cloud',name:'Cloud trapper',stock:'MSFT'},
 {id:'electric',name:'Electric trapper',stock:'AMZN'},
 {id:'racer',name:'Racer bucket',stock:'TSLA'},
 {id:'orbit',name:'Orbit beanie',stock:'INTC'},
 {id:'afterhours',name:'Afterhours cap',stock:'COIN'},
] as const;
export function Avatar({seed=0,size=48,label}:{seed?:number;size?:number;label?:string}){const n=((seed%HEADWEAR.length)+HEADWEAR.length)%HEADWEAR.length;return <span role={label?'img':undefined} aria-label={label} aria-hidden={!label} className="db-avatar db-plush-avatar" style={{width:size,height:size}}><Image src={`/assets/characters/${HEADWEAR[n].id}.png`} alt="" width={size} height={size} sizes={`${size}px`}/></span>}
export function CharacterCrew({className=''}:{className?:string}){return <div className={`db-character-crew ${className}`} aria-hidden="true">{[0,1,2].map(seed=><div key={seed}><Avatar seed={seed} size={360}/></div>)}</div>}
// Only these tickers ship a logo SVG. For every other tokenized name we draw a
// two-letter monogram — deciding up front avoids the broken-image flash you get
// from an SSR <img> that 404s before React can attach an onError handler.
const LOGO_TICKERS=new Set(['AAPL','AMZN','NFLX','NVDA','SBUX','SONY','GOOGL','TSLA','META','MSFT','COIN','INTC','SPCX','CRCL','MSTR']);
export function StockIcon({ticker,size=44}:{ticker:string;size?:number}){const hasLogo=LOGO_TICKERS.has(ticker);return <span className={`db-token db-token-${ticker}`} style={{width:size,height:size}}>{hasLogo?<img src={`/assets/stock/${ticker}.svg`} alt={`${ticker} logo`} width={size*.54} height={size*.54}/>:<span className="db-token-mono" style={{fontSize:size*.34}}>{ticker.slice(0,2)}</span>}</span>}
export function AvatarStack(){return <span className="db-avatar-stack" aria-label="Illustrated community avatars">{[0,1,2,3].map(i=><Avatar key={i} seed={i} size={36}/>)}</span>}
