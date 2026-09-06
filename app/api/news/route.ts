import {NextResponse} from 'next/server';
import {fetchCompanyNews,COMPANY_QUERIES} from '@/lib/news/provider';
import {createRequestCache,createRateLimit} from '@/lib/server/requests';
export const dynamic='force-dynamic';
const cached=createRequestCache<Awaited<ReturnType<typeof fetchCompanyNews>>>(15*60000,20,1);
const allowed=createRateLimit(60);let nextUpstream=0;
export async function GET(req:Request){
 const ticker=(new URL(req.url).searchParams.get('ticker')||'').toUpperCase();
 if(!Object.hasOwn(COMPANY_QUERIES,ticker))return NextResponse.json({error:'Unsupported company'},{status:400});
 if(!allowed())return NextResponse.json({error:'Please retry shortly'},{status:429,headers:{'Retry-After':'60'}});
 try {return NextResponse.json(await cached(ticker,()=>{if(Date.now()<nextUpstream)throw Error('Provider cooling down');nextUpstream=Date.now()+6000;return fetchCompanyNews(ticker)}),{headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({error:'Company news is temporarily unavailable. Please try again shortly.'},{status:503,headers:{'Retry-After':'30'}})}
}
