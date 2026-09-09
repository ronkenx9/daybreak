import 'server-only';
import {createHmac} from 'node:crypto';
import {HttpError} from '@/lib/account/auth-server';
export const MUSE_ORIGIN='https://musemirror.app';
export async function museRequest(userId:string,body:Record<string,unknown>,idempotencyKey?:string){
 const secret=process.env.MUSE_DAYBREAK_SECRET?.trim();
 if(!secret||secret.length<32)throw new HttpError(503,'Creation is being connected. Please try again shortly.');
 const raw=JSON.stringify({...body,daybreakUserId:userId,requestId:idempotencyKey});const timestamp=String(Date.now());
 const signature=createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest('hex');
 const response=await fetch(`${MUSE_ORIGIN}/api/integrations/daybreak`,{method:'POST',headers:{'content-type':'application/json','x-daybreak-timestamp':timestamp,'x-daybreak-signature':signature,...(idempotencyKey?{'x-muse-idempotency-key':idempotencyKey}:{})},body:raw,cache:'no-store',signal:AbortSignal.timeout(285_000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new HttpError(response.status,typeof data.error==='string'?data.error:'Muse is temporarily unavailable');
 return {data,receipt:response.headers.get('x-muse-receipt')};
}
