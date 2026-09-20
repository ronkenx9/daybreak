import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { createChallenge, listCircleChallenges } from '@/lib/db/repo-economy';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ slug: string }> };
export async function GET(req: Request, context: Context) {
  try { const { slug } = await context.params; if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw new HttpError(400, 'Invalid Circle.'); const user = await requireUser(req).catch(() => null); return Response.json({ challenges: await listCircleChallenges(slug, user?.id) }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(req: Request, context: Context) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    const { slug } = await context.params;
    const body = await readJsonObject(req);
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
    const criteria = typeof body.criteria === 'string' ? body.criteria.trim() : '';
    const budgetCents = Number(body.budgetCents);
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
    const deadline = typeof body.deadline === 'string' ? new Date(body.deadline) : new Date(NaN);
    if (!/^[a-z0-9-]{1,80}$/.test(slug) || !/^[0-9a-f-]{36}$/i.test(idempotencyKey) || title.length < 10 || title.length > 100 || brief.length < 30 || brief.length > 2000 || criteria.length < 20 || criteria.length > 1000 || !Number.isSafeInteger(budgetCents) || budgetCents < 100 || budgetCents > 25000 || !Number.isFinite(deadline.getTime()) || deadline.getTime() < Date.now() + 24*3_600_000 || deadline.getTime() > Date.now() + 30*24*3_600_000) throw new HttpError(400, 'Check challenge title, brief, criteria, $1–$250 budget and 1–30 day deadline.');
    const challenge = await createChallenge(user.id, slug, { title, brief, criteria, budgetCents, deadline, idempotencyKey });
    return Response.json({ challenge }, { status: 201 });
  } catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(409, error.message) : error); }
}
