import { getPublicThesis } from '@/lib/db/repo-theses';
import { agentErrorResponse, AgentApiError } from '@/lib/agents/errors';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{const thesis=await getPublicThesis((await params).id);if(!thesis)throw new AgentApiError('NOT_FOUND','Thesis not found',404);return Response.json({thesis},{headers:{'Cache-Control':'public, s-maxage=15'}})}catch(error){return agentErrorResponse(error)}}
