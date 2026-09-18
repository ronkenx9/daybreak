import { requireAgent } from '@/lib/agents/auth';
import { agentErrorResponse } from '@/lib/agents/errors';
import { getAgentLimits } from '@/lib/db/repo-agents';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return Response.json(await getAgentLimits(await requireAgent(request)),{headers:{'Cache-Control':'private, no-store'}})}catch(error){return agentErrorResponse(error)}}
