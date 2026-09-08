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

// ---- Cross-stock news feed for the always-on ticker ----
// One combined GDELT query (fits the rate limit), then tag each headline to the
// ticker whose name it matches. Real headlines only; the ticker links each to
// that stock's workspace — news → stock → paired memecoin is the flywheel.
export interface FeedItem extends Article { ticker: string }
const FEED_QUERY = '(Nvidia OR Tesla OR Coinbase OR MicroStrategy OR SpaceX OR "Circle Internet" OR Apple OR Amazon OR "Meta Platforms" OR Alphabet OR Microsoft OR Intel OR SanDisk) sourcelang:english';
const FEED_ORDER = ['NVDA', 'TSLA', 'COIN', 'MSTR', 'CRCL', 'SPCX', 'META', 'GOOGL', 'MSFT', 'AAPL', 'AMZN', 'INTC', 'SNDK'];
export async function fetchNewsFeed(): Promise<{ items: FeedItem[]; checkedAt: number; provider: string }> {
  const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  url.search = new URLSearchParams({ query: FEED_QUERY, mode: 'artlist', format: 'json', maxrecords: '75', sort: 'datedesc', timespan: '2d' }).toString();
  const r = await fetch(url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
  if (!r.ok) throw Error('News provider unavailable');
  const data = await r.json();
  const raw = data && typeof data === 'object' && 'articles' in data && Array.isArray((data as { articles: unknown[] }).articles) ? (data as { articles: Array<Record<string, unknown>> }).articles : [];
  const seen = new Set<string>(); const items: FeedItem[] = [];
  for (const a of raw) {
    if (!a || typeof a.title !== 'string' || typeof a.url !== 'string') continue;
    let u: URL; try { u = new URL(a.url); } catch { continue; }
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) continue;
    u.hash = ''; for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k);
    const key = u.toString(); if (seen.has(key)) continue;
    const ticker = FEED_ORDER.find((t) => HEADLINE_MATCH[t]?.test(a.title as string));
    if (!ticker) continue;
    seen.add(key);
    const sd = a.seendate;
    const date = typeof sd === 'string' ? sd.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z') : '';
    items.push({ ticker, title: (a.title as string).slice(0, 200), url: key, source: u.hostname.replace(/^www\./, ''), seenAt: Number.isFinite(Date.parse(date)) ? new Date(date).toISOString() : '' });
    if (items.length === 20) break;
  }
  return { items, checkedAt: Date.now(), provider: 'GDELT' };
}
