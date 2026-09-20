import { errorResponse, HttpError, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { cancelEmptyChallenge } from '@/lib/db/repo-economy';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function POST(req: Request, context: Context) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, 'Invalid challenge.');
    return Response.json(await cancelEmptyChallenge(user.id, id));
  } catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(409, error.message) : error); }
}
