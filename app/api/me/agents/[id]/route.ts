import { errorResponse, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { setOwnedAgentStatus } from '@/lib/db/repo-agents';
import { AgentApiError } from '@/lib/agents/errors';
export const dynamic='force-dynamic';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=await requireUser(request);const body=await readJsonObject(request,1_024);const status=body.status==='active'||body.status==='paused'||body.status==='revoked'?body.status:null;if(!status)return Response.json({error:'Choose active, paused or revoked'},{status:400});return Response.json({agent:await setOwnedAgentStatus(user.id,(await params).id,status)},{headers:{'Cache-Control':'private, no-store'}})}catch(error){return error instanceof AgentApiError?Response.json({error:error.message},{status:error.status}):errorResponse(error)}}
