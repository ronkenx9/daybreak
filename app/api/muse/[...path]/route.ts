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
  if(path[0]==='pulls'){const day=new Date().toISOString().slice(0,10);const [used,pulls,community]=await Promise.all([store.freePullUsed(user.id,day),store.listJobs(user.id,12),store.communityPulls(8)]);return Response.json({freeLeft:used?0:1,pulls,community});}
  if(path[0]!=='snapshot')throw new HttpError(404,'Not found');
 return Response.json((await museRequest(user.id,{action:'snapshot'})).data);
 }catch(e){return errorResponse(e);}}
export async function POST(req:Request,ctx:Context){let running:{userId:string;id:string}|undefined;try{
 const user=await requireUser(req);requireWriteCapacity(user.id);const {path}=await ctx.params;const body=await readJsonObject(req,8_000_000);
  if(path[0]==='quote'){const {walletAddress}=await requireUserWithWallet(req);return Response.json((await museRequest(user.id,{action:'quote',id:body.id,kind:body.kind,asset:body.asset,payer:walletAddress,capsuleId:body.capsuleId,direct:body.direct===true,input:body.input})).data);}
 if(path[0]==='publish'&&uuid(body.id)){if(!await store.publishJob(user.id,body.id))throw new HttpError(404,'Finished creation not found');return Response.json({imageUrl:`https://www.daybreakcircles.lol/api/muse/art/${body.id}`});}
  if(path[0]==='capsules'){if(!uuid(body.requestId))throw new HttpError(400,'Missing request ID');return Response.json((await museRequest(user.id,{action:'create',input:body.input,txHash:body.txHash},body.requestId)).data);}
  if(path[0]==='moment'){if(typeof body.ticker!=='string'||!TOKENS.some(t=>t.ticker===body.ticker))throw new HttpError(400,'Choose a stock for the moment');const cached=await store.latestAgentMoment(body.ticker);if(cached)return Response.json({moment:cached,cached:true});const company=TOKENS.find(t=>t.ticker===body.ticker)?.name??body.ticker;const fresh=await museRequest(user.id,{action:'moment',ticker:body.ticker,company});if(typeof fresh.data?.moment!=='string'||!fresh.data.moment.trim())throw new HttpError(502,'The moment did not land. Try again.');const text=fresh.data.moment.slice(0,280);await store.saveAgentMoment(body.ticker,text);return Response.json({moment:text,cached:false});}
  if(path[0]!=='forge')throw new HttpError(404,'Not found');
  if(!uuid(body.id)||typeof body.moment!=='string'||body.moment.length>800||!TOKENS.some(t=>t.ticker===body.ticker))throw new HttpError(400,'Choose a stock and a moment of up to 800 characters');
  const momentText: string = body.moment;
  const capsuleId: string | null = typeof body.capsuleId==='string'?body.capsuleId:null;
  // Direct generation needs no capsule; the legacy capsule path still accepts one.
  const direct=body.direct===true||!body.capsuleId;
  if(!direct&&!uuid(body.capsuleId))throw new HttpError(400,'Choose a visual world or generate directly');
  const kind=body.kind==='banner'?'banner':'pfp';
  const format=kind;
  const pullGroup=typeof body.pullGroup==='string'&&uuid(body.pullGroup)?body.pullGroup:null;
  const lane=body.lane==='news'||body.lane==='nostalgia'||body.lane==='agent'?body.lane:null;
  // Free daily pull: one free meme pull per user per UTC day. The day is consumed
  // at claim time and never released — a failed free forge burns the day, which
  // keeps replays ("Check paid request" reuses the same job id and skips the
  // claim) from ever minting extra free pulls. Banner second pulls are always paid.
  const dayUtc=new Date().toISOString().slice(0,10);
  // Entitlement binds to the stored job, never to mutable retry input. A paid
  // fallback uses a new request ID, preserving the original free job and its
  // idempotency history.
  const prior=await store.job(user.id,body.id);
  const fingerprint=createHash('sha256').update(JSON.stringify({capsule:body.capsuleId,ticker:body.ticker,moment:body.moment,kind})).digest('hex');
  let freePullClaimed=kind==='pfp'&&prior?(prior as {free?:unknown}).free===true:false;
  let createdFree=false;
  if(!prior&&kind==='pfp'&&body.freePull===true){
   createdFree=await store.createFreeJob(user.id,body.id,String(body.ticker),capsuleId,fingerprint,kind,pullGroup,lane,momentText,dayUtc);
   if(!createdFree){const raced=await store.job(user.id,body.id);if(raced)return Response.json(raced,{status:202});throw new HttpError(402,'Free daily pull already used — pay for this pull');}
   freePullClaimed=true;
  }
  if(prior?.status==='completed')return Response.json(prior);
  if(prior&&!await store.retryJob(user.id,body.id,fingerprint))return Response.json(prior,{status:202});
  if(!prior&&!createdFree&&!await store.createJob(user.id,body.id,String(body.ticker),capsuleId,fingerprint,kind,pullGroup,lane,momentText,false))return Response.json({id:body.id,status:'pending'},{status:202});
  running={userId:user.id,id:body.id};
  const result=await museRequest(user.id,{action:'forge',capsuleId:body.capsuleId,direct,format,input:{moment:momentText},txHash:body.txHash,freePull:freePullClaimed},body.id);
 const image=typeof result.data.image==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(result.data.image)?result.data.image:null;
 if(!image||!result.receipt)throw new HttpError(502,'Muse did not return completed artwork. Your request was saved. Please check its status before trying again.');
 // Test credits never earn promotional points. Only provider-confirmed settled production jobs do.
 const eligible=result.data.paid===true;
 await store.completeJob(user.id,body.id,image,result.receipt,eligible);
 return Response.json(await store.job(user.id,body.id));
  }catch(e){if(running)await store.failJob(running.userId,running.id,e instanceof Error?e.message:'Creation failed').catch(()=>null);return errorResponse(e);}}
