import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { awardChallenge } from '@/lib/db/repo-economy';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function POST(req: Request, context: Context) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    const { id } = await context.params; const body = await readJsonObject(req);
    if (!/^[0-9a-f-]{36}$/i.test(id) || typeof body.submissionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.submissionId)) throw new HttpError(400, 'Invalid award request.');
    return Response.json(await awardChallenge(user.id, id, body.submissionId));
  } catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(409, error.message) : error); }
}
