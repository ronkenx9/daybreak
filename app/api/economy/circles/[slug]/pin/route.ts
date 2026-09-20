import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { pinCircleWithCredits } from '@/lib/db/repo-economy';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ slug: string }> };
export async function POST(req: Request, context: Context) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    const { slug } = await context.params;
    const body = await readJsonObject(req);
    if (!/^[a-z0-9-]{1,80}$/.test(slug) || typeof body.idempotencyKey !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.idempotencyKey)) throw new HttpError(400, 'Invalid pin request.');
    return Response.json(await pinCircleWithCredits(user.id, slug, body.idempotencyKey), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(409, error.message) : error); }
}
