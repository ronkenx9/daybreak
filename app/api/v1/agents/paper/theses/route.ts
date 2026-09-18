import { readAgentJson, requireAgent } from '@/lib/agents/auth';
import { agentErrorResponse } from '@/lib/agents/errors';
import { normalizeAgentPaperThesis, requireIdempotencyKey } from '@/lib/agents/validation';
import { publishAgentPaperThesis } from '@/lib/db/repo-agents';
import { getPublicThesis } from '@/lib/db/repo-theses';
import { requireThesisInstrument } from '@/lib/theses/instruments';
import { thesisSlug } from '@/lib/theses/model';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{const agent=await requireAgent(request,'paper:publish');const key=requireIdempotencyKey(request);const input=normalizeAgentPaperThesis(await readAgentJson(request,8_192));const instrument=requireThesisInstrument(input.instrumentId,'create');const published=await publishAgentPaperThesis(agent,instrument.companyId,thesisSlug(input.title),input,key);const thesis=await getPublicThesis(String(published.thesisId));return Response.json({thesis,request:{idempotencyKey:key,state:'succeeded'}},{status:201,headers:{'Cache-Control':'private, no-store'}})}catch(error){return agentErrorResponse(error)}}
