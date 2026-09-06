import 'server-only';
export const COMPANY_QUERIES:Record<string,string>={AAPL:'Apple (iPhone OR earnings OR stock)',AMZN:'Amazon (AWS OR earnings OR stock)',GOOGL:'(Google OR Alphabet) (earnings OR stock OR technology)',NVDA:'Nvidia',TSLA:'Tesla (automotive OR earnings OR stock)',META:'"Meta Platforms"',MSFT:'Microsoft',COIN:'Coinbase',CRCL:'"Circle Internet"',INTC:'Intel (semiconductor OR earnings OR stock)',MSTR:'(MicroStrategy OR "Strategy Inc")',SNDK:'Sandisk',SPCX:'SpaceX',SONY:'Sony',NFLX:'Netflix',SBUX:'Starbucks'};
const HEADLINE_MATCH:Record<string,RegExp>={AAPL:/\b(apple|iphone|ipad|macbook)\b/i,AMZN:/\b(amazon|aws)\b/i,GOOGL:/\b(google|alphabet)\b/i,NVDA:/\bnvidia\b/i,TSLA:/\btesla\b/i,META:/\b(meta|facebook|instagram|whatsapp)\b/i,MSFT:/\b(microsoft|azure)\b/i,COIN:/\bcoinbase\b/i,CRCL:/\b(circle|usdc)\b/i,INTC:/\bintel\b/i,MSTR:/\b(microstrategy|strategy)\b/i,SNDK:/\bsandisk\b/i,SPCX:/\b(spacex|starlink)\b/i,SONY:/\b(sony|playstation)\b/i,NFLX:/\bnetflix\b/i,SBUX:/\bstarbucks\b/i};
export interface Article {title:string;url:string;source:string;seenAt:string}
export function normalizeArticles(input:unknown,ticker?:string):Article[]{
 if(!input||typeof input!=='object'||!('articles' in input)||!Array.isArray(input.articles))throw Error('Unexpected news response');
 const seen=new Set<string>();const out:Article[]=[];
 for(const a of input.articles){if(!a||typeof a.title!=='string'||typeof a.url!=='string')continue;let url:URL;try{url=new URL(a.url)}catch{continue}if(!['https:','http:'].includes(url.protocol)||url.username||url.password)continue;
 url.hash='';for(const k of [...url.searchParams.keys()])if(k.startsWith('utm_'))url.searchParams.delete(k);
 if(ticker&&!HEADLINE_MATCH[ticker]?.test(a.title))continue;
 const key=url.toString();if(seen.has(key))continue;seen.add(key);
 const date=typeof a.seendate==='string'?a.seendate.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,'$1-$2-$3T$4:$5:$6Z'):'';
 out.push({title:a.title.slice(0,300),url:key,source:url.hostname.replace(/^www\./,''),seenAt:Number.isFinite(Date.parse(date))?new Date(date).toISOString():''});if(out.length===8)break;
 }return out;
}
export async function fetchCompanyNews(ticker:string){
 const query=COMPANY_QUERIES[ticker];if(!query)throw Error('Unsupported company');
 const url=new URL('https://api.gdeltproject.org/api/v2/doc/doc');url.search=new URLSearchParams({query:`${query} sourcelang:english`,mode:'artlist',format:'json',maxrecords:'50',sort:'datedesc',timespan:'7d'}).toString();
 const r=await fetch(url,{signal:AbortSignal.timeout(30000),cache:'no-store'});if(!r.ok)throw Error('News provider unavailable');
 return {ticker,articles:normalizeArticles(await r.json(),ticker),checkedAt:Date.now(),provider:'GDELT'};
}
