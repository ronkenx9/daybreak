import {NextResponse} from 'next/server';
import {readPrices} from '@/lib/base/prices';
import {priceState,type PriceMap} from '@/lib/base/model';
import {createRequestCache,createRateLimit} from '@/lib/server/requests';
export const dynamic='force-dynamic';
const cached=createRequestCache<PriceMap>(30000,1,1);const allowed=createRateLimit(240);
export async function GET(){
 if(!allowed())return NextResponse.json({error:'Too many requests'},{status:429,headers:{'Retry-After':'60'}});
 try{const data=await cached('prices',readPrices);if(!Object.values(data).some(p=>p.state!=='unavailable'))throw Error('No price data');return NextResponse.json(Object.fromEntries(Object.entries(data).map(([k,v])=>[k,priceState(v)])),{headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({error:'Prices are unavailable. Please retry.'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'30'}})}
}
