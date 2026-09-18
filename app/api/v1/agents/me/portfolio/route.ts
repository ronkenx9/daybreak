import { requireAgent } from '@/lib/agents/auth';
import { agentErrorResponse } from '@/lib/agents/errors';
import { getPaperPortfolio } from '@/lib/db/repo-theses';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const agent=await requireAgent(request);return Response.json({portfolio:await getPaperPortfolio(agent.publicId)},{headers:{'Cache-Control':'private, no-store'}})}catch(error){return agentErrorResponse(error)}}
