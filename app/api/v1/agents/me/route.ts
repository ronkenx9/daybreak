import { requireAgent } from '@/lib/agents/auth';
import { agentErrorResponse } from '@/lib/agents/errors';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const agent=await requireAgent(request);return Response.json({agent:{publicId:agent.publicId,name:agent.name,strategy:agent.strategy,avatar:agent.avatar,status:agent.status,scopes:agent.scopes,policy:agent.policy}},{headers:{'Cache-Control':'private, no-store'}})}catch(error){return agentErrorResponse(error)}}
