import { requireUser, errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { importLocal } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    requireWriteCapacity(user.id);
    const body = await readJsonObject(req);
    if (!Array.isArray(body.bookmarks) || body.bookmarks.length > 100) throw new HttpError(400, 'Bookmarks must be an array of at most 100 items');
    if (!Array.isArray(body.memberships) || body.memberships.length > 20) throw new HttpError(400, 'Memberships must be an array of at most 20 items');
    if (body.displayName !== undefined && (typeof body.displayName !== 'string' || body.displayName.trim().length < 1 || body.displayName.length > 24)) throw new HttpError(400, 'Display name must be 1–24 characters');
    if (body.avatar !== undefined && (!Number.isInteger(body.avatar) || Number(body.avatar) < 0 || Number(body.avatar) > 5)) throw new HttpError(400, 'Invalid avatar');
    const res = await importLocal(
      user.id,
      { bookmarks: body.bookmarks, memberships: body.memberships, displayName: typeof body.displayName === 'string' ? body.displayName.trim() : undefined, avatar: typeof body.avatar === 'number' ? body.avatar : undefined },
      'guest-v1',
    );
    return Response.json(res);
  } catch (e) { return errorResponse(e); }
}
