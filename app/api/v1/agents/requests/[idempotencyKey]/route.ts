import { requireAgent } from '@/lib/agents/auth';
import { agentErrorResponse } from '@/lib/agents/errors';
import { getAgentRequest } from '@/lib/db/repo-agents';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{idempotencyKey:string}>}){try{return Response.json({request:await getAgentRequest(await requireAgent(request),decodeURIComponent((await params).idempotencyKey))},{headers:{'Cache-Control':'private, no-store'}})}catch(error){return agentErrorResponse(error)}}
