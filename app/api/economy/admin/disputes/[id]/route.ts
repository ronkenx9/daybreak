import { errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { resolveChallengeDispute } from '@/lib/db/repo-economy';
import { requireEconomyAdmin } from '@/lib/economy/admin';

export const dynamic = 'force-dynamic';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireEconomyAdmin(req);
    const { id } = await params; const body = await readJsonObject(req);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !['award','refund'].includes(String(body.decision)) || typeof body.note !== 'string') throw new HttpError(400, 'Invalid dispute decision.');
    return Response.json(await resolveChallengeDispute(id, body.decision as 'award' | 'refund', body.note, admin.id, typeof body.submissionId === 'string' ? body.submissionId : undefined));
  } catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(409, error.message) : error); }
}
