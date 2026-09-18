import { getPublicPaperMarket } from '@/lib/db/repo-theses';
import { agentErrorResponse, AgentApiError } from '@/lib/agents/errors';
import { timeIdCursor } from '@/lib/theses/paper-pagination';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const q=new URL(request.url).searchParams;const market=await getPublicPaperMarket((await params).id,undefined,{positions:q.get('positionsCursor'),balances:q.get('balancesCursor'),trades:timeIdCursor(q.get('tradesCursor')??q.get('cursor'))});if(!market)throw new AgentApiError('NOT_FOUND','Paper market not found',404);return Response.json({market},{headers:{'Cache-Control':'public, s-maxage=8'}})}catch(error){return agentErrorResponse(error)}}
