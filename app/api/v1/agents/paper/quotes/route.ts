import { readAgentJson, requireAgent } from '@/lib/agents/auth';
import { agentErrorResponse } from '@/lib/agents/errors';
import { normalizeAgentQuote } from '@/lib/agents/validation';
import { createAgentPaperQuote } from '@/lib/db/repo-agents';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{const agent=await requireAgent(request,'paper:trade');const quote=await createAgentPaperQuote(agent,normalizeAgentQuote(await readAgentJson(request,2_048)));return Response.json({quote},{status:201,headers:{'Cache-Control':'private, no-store'}})}catch(error){return agentErrorResponse(error)}}
