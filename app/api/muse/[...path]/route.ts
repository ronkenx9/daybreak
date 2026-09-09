import {createHash} from 'node:crypto';
import {requireUser,requireUserWithWallet,readJsonObject,HttpError,errorResponse} from '@/lib/account/auth-server';
import {requireWriteCapacity} from '@/lib/account/request-guard';
import {TOKENS} from '@/lib/base/tokens';
import {museRequest} from '@/lib/muse/client';
import * as store from '@/lib/muse/store';
export const dynamic='force-dynamic';
export const maxDuration=300;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
type Context={params:Promise<{path:string[]}>};
export async function GET(req:Request,ctx:Context){try{const {path}=await ctx.params;
 if(path[0]==='spotlight')return Response.json({communities:await store.spotlight()});
 if(path[0]==='art'&&uuid(path[1])){const image=await store.publicArt(path[1]);const match=image?.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);if(!match)throw new HttpError(404,'Artwork not found');return new Response(Buffer.from(match[2],'base64'),{headers:{'content-type':match[1],'cache-control':'public, max-age=3600','x-content-type-options':'nosniff'}});}
 const user=await requireUser(req);
 if(path[0]==='jobs'&&uuid(path[1])){const result=await store.job(user.id,path[1]);if(!result)throw new HttpError(404,'Creation not found');return Response.json(result);}
 if(path[0]!=='snapshot')throw new HttpError(404,'Not found');
 return Response.json((await museRequest(user.id,{action:'snapshot'})).data);
 }catch(e){return errorResponse(e);}}
export async function POST(req:Request,ctx:Context){let running:{userId:string;id:string}|undefined;try{
 const user=await requireUser(req);requireWriteCapacity(user.id);const {path}=await ctx.params;const body=await readJsonObject(req,8_000_000);
 if(path[0]==='quote'){const {walletAddress}=await requireUserWithWallet(req);return Response.json((await museRequest(user.id,{action:'quote',id:body.id,kind:body.kind,asset:body.asset,payer:walletAddress,capsuleId:body.capsuleId,input:body.input})).data);}
 if(path[0]==='publish'&&uuid(body.id)){if(!await store.publishJob(user.id,body.id))throw new HttpError(404,'Finished creation not found');return Response.json({imageUrl:`https://www.daybreakcircles.lol/api/muse/art/${body.id}`});}
 if(path[0]==='capsules'){if(!uuid(body.requestId))throw new HttpError(400,'Missing request ID');return Response.json((await museRequest(user.id,{action:'create',input:body.input,txHash:body.txHash},body.requestId)).data);}
 if(path[0]!=='forge')throw new HttpError(404,'Not found');
 if(!uuid(body.id)||!uuid(body.capsuleId)||typeof body.moment!=='string'||body.moment.length>800||!TOKENS.some(t=>t.ticker===body.ticker))throw new HttpError(400,'Choose a stock, Capsule and a moment of up to 800 characters');
 const fingerprint=createHash('sha256').update(JSON.stringify({capsule:body.capsuleId,ticker:body.ticker,moment:body.moment})).digest('hex');
 const prior=await store.job(user.id,body.id);
 if(prior?.status==='completed')return Response.json(prior);
 if(prior&&!await store.retryJob(user.id,body.id,fingerprint))return Response.json(prior,{status:202});
 if(!prior&&!await store.createJob(user.id,body.id,String(body.ticker),body.capsuleId,fingerprint))return Response.json({id:body.id,status:'pending'},{status:202});
 running={userId:user.id,id:body.id};
 const result=await museRequest(user.id,{action:'forge',capsuleId:body.capsuleId,input:{moment:body.moment},txHash:body.txHash},body.id);
 const image=typeof result.data.image==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(result.data.image)?result.data.image:null;
 if(!image||!result.receipt)throw new HttpError(502,'Muse did not return completed artwork. Your request was saved. Please check its status before trying again.');
 // Test credits never earn promotional points. Only provider-confirmed settled production jobs do.
 const eligible=result.data.paid===true;
 await store.completeJob(user.id,body.id,image,result.receipt,eligible);
 return Response.json(await store.job(user.id,body.id));
 }catch(e){if(running)await store.failJob(running.userId,running.id,e instanceof Error?e.message:'Creation failed').catch(()=>null);return errorResponse(e);}}
