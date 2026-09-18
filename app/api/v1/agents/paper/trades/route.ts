import { readAgentJson, requireAgent } from '@/lib/agents/auth';
import { agentErrorResponse, AgentApiError } from '@/lib/agents/errors';
import { normalizeRationale, requireIdempotencyKey } from '@/lib/agents/validation';
import { executeAgentPaperQuote } from '@/lib/db/repo-agents';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{const agent=await requireAgent(request,'paper:trade');const key=requireIdempotencyKey(request);const body=await readAgentJson(request,2_048);const quoteId=typeof body.quoteId==='string'?body.quoteId:'';if(!/^[a-f0-9-]{36}$/i.test(quoteId))throw new AgentApiError('INVALID_INPUT','quoteId must be a UUID');const receipt=await executeAgentPaperQuote(agent,quoteId,key,normalizeRationale(body.rationale));return Response.json({receipt,request:{idempotencyKey:key,state:'succeeded'}},{headers:{'Cache-Control':'private, no-store'}})}catch(error){return agentErrorResponse(error)}}
