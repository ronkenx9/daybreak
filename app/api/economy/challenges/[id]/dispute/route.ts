import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { fileChallengeDispute } from '@/lib/db/repo-economy';
import { economyReviewConfigured } from '@/lib/economy/config';

export const dynamic = 'force-dynamic';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    if (!economyReviewConfigured()) throw new HttpError(503, 'Dispute review is temporarily unavailable.');
    const { id } = await params; const body = await readJsonObject(req);
    if (!/^[0-9a-f-]{36}$/i.test(id) || typeof body.reason !== 'string') throw new HttpError(400, 'Describe the dispute.');
    return Response.json(await fileChallengeDispute(user.id, id, body.reason), { status: 201 });
  } catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(409, error.message) : error); }
}
