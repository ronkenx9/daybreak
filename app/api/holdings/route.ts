import {NextResponse} from 'next/server';
import {isAddress} from 'viem';
import {readHoldings} from '@/lib/base/holdings';
import type {HoldingsSnapshot} from '@/lib/base/model';
import {createRequestCache,createRateLimit} from '@/lib/server/requests';
export const dynamic='force-dynamic';
const cached=createRequestCache<HoldingsSnapshot>(15000);const allowed=createRateLimit();
export async function GET(req:Request){
 const address=new URL(req.url).searchParams.get('address');
 if(!address||!isAddress(address))return NextResponse.json({error:'Invalid wallet address'},{status:400});
 if(!allowed())return NextResponse.json({error:'Too many requests. Try again shortly.'},{status:429,headers:{'Retry-After':'60'}});
 try{return NextResponse.json(await cached(address.toLowerCase(),()=>readHoldings(address as `0x${string}`)),{headers:{'Cache-Control':'private, no-store'}})}
 catch{return NextResponse.json({error:'Holdings are unavailable. Your balance has not been reported as zero.'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'15'}})}
}
