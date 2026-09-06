import { requireUser, errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { addBookmark, removeBookmark, isValidCompanyId } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    requireWriteCapacity(user.id);
    const { companyId } = await readJsonObject(req);
    if (!isValidCompanyId(companyId)) throw new HttpError(400, 'Invalid companyId');
    const result = await addBookmark(user.id, companyId);
    if (!result.ok) throw new HttpError(409, 'Bookmark limit reached');
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    requireWriteCapacity(user.id);
    const companyId = new URL(req.url).searchParams.get('companyId') ?? '';
    if (!isValidCompanyId(companyId)) throw new HttpError(400, 'Invalid companyId');
    await removeBookmark(user.id, companyId);
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
