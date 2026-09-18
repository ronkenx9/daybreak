import { errorResponse, requireUser } from '@/lib/account/auth-server';
import { revokeOwnedAgentKey } from '@/lib/db/repo-agents';
import { AgentApiError } from '@/lib/agents/errors';
export const dynamic='force-dynamic';
export async function DELETE(request:Request,{params}:{params:Promise<{id:string;keyId:string}>}){try{const user=await requireUser(request);const values=await params;await revokeOwnedAgentKey(user.id,values.id,values.keyId);return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store'}})}catch(error){return error instanceof AgentApiError?Response.json({error:error.message},{status:error.status}):errorResponse(error)}}
