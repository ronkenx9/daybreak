'use client';
import {ArrowUpRight,ShieldAlert} from 'lucide-react';
import {TypeBadge} from './Identity';
import MemeLogo from './MemeLogo';
import MemeChart from './MemeChart';

export interface MemeTokenData{symbol:string;name:string;address:string;priceUsd:number|null;liquidityUsd:number;volume24Usd:number;url:string;lowLiquidity:boolean;volume?:{h1:number;h6:number;h24:number};change?:{h1:number;h6:number;h24:number};marketCapUsd?:number|null;txns24?:number;ageMs?:number|null;pairAddress?:string|null;imageUrl?:string|null}
const usd0=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const priceFmt=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n<1?6:2});
const pct=(n:number|undefined)=>n==null||!Number.isFinite(n)?null:<span className={`db-chg ${n>0?'db-chg-up':n<0?'db-chg-down':'db-chg-flat'}`}>{n>0?'+':''}{n.toFixed(2)}%</span>;

// Shared in-app detail for a memestock: live chart + stats, then a compact risk
// note. The only way out is the explicit DexScreener button.
export default function MemestockDetail({token,pairedWith,companyName}:{token:MemeTokenData;pairedWith:string;companyName:string}){
 return <div className="db-meme-detail">
  <div className="db-meme-detail-head"><MemeLogo symbol={token.symbol} imageUrl={token.imageUrl} size={52}/><div><h3>{token.name||token.symbol}</h3><span className="db-ticker">{token.symbol} · paired with {pairedWith}</span></div><TypeBadge kind="meme"/></div>

  <div className="db-meme-headline"><strong>{token.priceUsd!=null?priceFmt(token.priceUsd):'—'}</strong>{pct(token.change?.h24)}<small>24h</small></div>

  <MemeChart token={token.address} up={token.change?.h24!=null?token.change.h24>=0:undefined}/>

  <div className="db-meme-stats"><div><strong>{usd0(token.liquidityUsd)}</strong><small>Liquidity</small></div><div><strong>{usd0(token.volume24Usd)}</strong><small>24h volume</small></div><div><strong>{token.marketCapUsd?usd0(token.marketCapUsd):'—'}</strong><small>Market cap</small></div></div>

  <a className="db-button db-blue-button" href={token.url} target="_blank" rel="noopener noreferrer">View on DexScreener <ArrowUpRight size={16}/></a>

  <p className="db-meme-risk"><ShieldAlert size={15}/> Community meme token paired against {companyName}’s stock — <strong>not</strong> {companyName} or its stock, no official link, highly speculative and often goes to zero.{token.lowLiquidity?' Low liquidity here makes exiting hard.':''} Pool data via DexScreener; Daybreak doesn’t endorse, verify or execute anything.</p></div>;
}
