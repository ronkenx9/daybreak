import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { createAgentForOwner, listOwnerAgents } from '@/lib/db/repo-agents';
import { normalizeAgentSetup } from '@/lib/agents/validation';
import { requireThesisInstrument } from '@/lib/theses/instruments';
import { AgentApiError } from '@/lib/agents/errors';
export const dynamic='force-dynamic';
const failure=(error:unknown)=>error instanceof AgentApiError?Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}}):errorResponse(error);
export async function GET(request:Request){try{const user=await requireUser(request);return Response.json({items:await listOwnerAgents(user.id)},{headers:{'Cache-Control':'private, no-store'}})}catch(error){return failure(error)}}
export async function POST(request:Request){try{const user=await requireUser(request);const input=normalizeAgentSetup(await readJsonObject(request,8_192));for(const id of input.allowedInstrumentIds)requireThesisInstrument(id,'create');const result=await createAgentForOwner(user.id,input);return Response.json(result,{status:201,headers:{'Cache-Control':'private, no-store'}})}catch(error){if(error instanceof Error&&!('status'in error))return errorResponse(new HttpError(400,error.message));return failure(error)}}
