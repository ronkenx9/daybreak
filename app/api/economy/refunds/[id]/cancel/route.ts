import { errorResponse, HttpError, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { cancelCreditRefund } from '@/lib/db/repo-economy';

export const dynamic = 'force-dynamic';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    const { id } = await params; if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, 'Invalid refund request.');
    return Response.json(await cancelCreditRefund(user.id, id));
  } catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(409, error.message) : error); }
}
