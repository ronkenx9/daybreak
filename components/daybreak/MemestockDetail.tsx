'use client';
import {ArrowUpRight,ShieldAlert} from 'lucide-react';

export interface MemeTokenData{symbol:string;name:string;address:string;priceUsd:number|null;liquidityUsd:number;volume24Usd:number;url:string;lowLiquidity:boolean}
const usd0=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const priceFmt=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:n<1?6:2});

// Shared in-app detail for a memestock. No redirect for the detail itself; the
// only way out is the explicit DexScreener button.
export default function MemestockDetail({token,pairedWith,companyName}:{token:MemeTokenData;pairedWith:string;companyName:string}){
 return <div className="db-meme-detail">
  <div className="db-meme-detail-head"><span className="db-token-mono db-meme-mono">{token.symbol.slice(0,2)}</span><div><h3>{token.name||token.symbol}</h3><span className="db-ticker">{token.symbol} · paired with {pairedWith}</span></div></div>
  <div className="db-meme-stats"><div><strong>{token.priceUsd!=null?priceFmt(token.priceUsd):'—'}</strong><small>Price</small></div><div><strong>{usd0(token.liquidityUsd)}</strong><small>Liquidity</small></div><div><strong>{usd0(token.volume24Usd)}</strong><small>24h volume</small></div></div>
  <div className="db-meme-warn"><ShieldAlert size={20}/><p>A community meme token that put liquidity against {companyName}’s stock token. It is <strong>not</strong> {companyName} or its stock, has no official connection, and is highly speculative — tokens like this often go to zero.{token.lowLiquidity?' Liquidity here is low, so exiting can be hard.':''}</p></div>
  <a className="db-button db-blue-button" href={token.url} target="_blank" rel="noopener noreferrer">View on DexScreener <ArrowUpRight size={16}/></a>
  <p className="db-small-note">Pool data via DexScreener. You’ll leave Daybreak to view or trade. Daybreak doesn’t endorse, verify or execute anything here.</p></div>;
}
