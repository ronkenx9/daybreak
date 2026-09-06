import { requireUser, errorResponse, HttpError } from '@/lib/account/auth-server';
import { addBookmark, removeBookmark, isValidCompanyId } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { companyId } = await req.json().catch(() => ({}));
    if (!isValidCompanyId(companyId)) throw new HttpError(400, 'Invalid companyId');
    await addBookmark(user.id, companyId);
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    const companyId = new URL(req.url).searchParams.get('companyId') ?? '';
    if (!isValidCompanyId(companyId)) throw new HttpError(400, 'Invalid companyId');
    await removeBookmark(user.id, companyId);
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
