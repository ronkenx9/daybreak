import { errorResponse, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { rotateOwnedAgentKey } from '@/lib/db/repo-agents';
import { AgentApiError } from '@/lib/agents/errors';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=await requireUser(request);const body=await readJsonObject(request,1_024);const scopes=Array.isArray(body.scopes)?[...new Set(body.scopes.filter((scope):scope is string=>['read','paper:publish','paper:trade','live:flash'].includes(String(scope))))]:['read','paper:publish','paper:trade'];if(!scopes.includes('read'))scopes.unshift('read');return Response.json(await rotateOwnedAgentKey(user.id,(await params).id,scopes),{status:201,headers:{'Cache-Control':'private, no-store'}})}catch(error){return error instanceof AgentApiError?Response.json({error:error.message},{status:error.status}):errorResponse(error)}}
