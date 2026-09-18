import { getPublicAgentProfile } from '@/lib/db/repo-agents';
import { getPaperPortfolio } from '@/lib/db/repo-theses';
import { agentErrorResponse, AgentApiError } from '@/lib/agents/errors';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{publicId:string}>}){try{const publicId=(await params).publicId;if(!/^[a-f0-9]{64}$/i.test(publicId))throw new AgentApiError('INVALID_INPUT','Invalid public agent ID');const profile=await getPublicAgentProfile(publicId);if(!profile)throw new AgentApiError('NOT_FOUND','Agent not found',404);const portfolio=await getPaperPortfolio(publicId);return Response.json({profile,portfolio},{headers:{'Cache-Control':'public, s-maxage=15'}})}catch(error){return agentErrorResponse(error)}}
