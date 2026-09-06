// Shared, JSON-safe data contracts. Monetary calculations stay in integers.
export const PRICE_MAX_AGE_MS = 26 * 60 * 60 * 1000; // 24h feed heartbeat + bounded grace
export type PriceState = 'reference' | 'aged' | 'paused' | 'unavailable';
export interface StockPrice { ticker:string; priceUsd:number|null; answerRaw:string|null; decimals:number; updatedAt:number|null; isStale:boolean; state:PriceState; reason?:string }
export type PriceMap=Record<string,StockPrice>;
export interface Holding { ticker:string;onchainSymbol:string;name:string;token:`0x${string}`;raw:string;scaledRaw:string;decimals:number;shares:string;tokenQuantity:string }
export interface HoldingsSnapshot { address:string;chainId:8453;blockNumber:string;observedAt:number;status:'complete'|'partial';holdings:Holding[];failedTokens:string[];prices:PriceMap }
export function priceState(p:StockPrice,now=Date.now()):StockPrice {
 if(p.state==='paused'||p.state==='unavailable')return p;
 const aged=p.updatedAt===null||now-p.updatedAt>PRICE_MAX_AGE_MS;
 return {...p,state:aged?'aged':'reference',isStale:aged};
}
export function validRound(answer:bigint,updatedAt:bigint,round:bigint,answered:bigint,decimals:number,now=Date.now()) {
 return answer>0n&&updatedAt>0n&&updatedAt<=BigInt(Math.floor(now/1000))&&round>0n&&answered>=round&&Number.isInteger(decimals)&&decimals>=0&&decimals<=18;
}
/** USD rounded to cents once at display; use 8 fixed decimals during aggregation. */
export function positionUsdAtoms(h:Holding,p?:StockPrice):bigint|null {
 if(!p||!p.answerRaw||p.state==='paused'||p.state==='unavailable')return null;
 return BigInt(h.raw)*BigInt(p.answerRaw)*100000000n/(10n**BigInt(h.decimals+p.decimals));
}
export function portfolio(h:Holding[],prices:PriceMap){let total=0n;let priced=0;let aged=0;for(const row of h){const p=prices[row.ticker];const v=positionUsdAtoms(row,p);if(v!==null){total+=v;priced++;if(priceState(p).isStale)aged++;}}return {total,priced,missing:h.length-priced,aged};}
export function usd(atoms:bigint){const cents=(atoms+500000n)/1000000n;return '$'+(cents/100n).toLocaleString('en-US')+'.'+(cents%100n).toString().padStart(2,'0');}
