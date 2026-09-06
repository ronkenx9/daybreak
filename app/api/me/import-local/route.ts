import { requireUser, errorResponse } from '@/lib/account/auth-server';
import { importLocal } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const res = await importLocal(
      user.id,
      { bookmarks: body.bookmarks, memberships: body.memberships, displayName: body.displayName, avatar: body.avatar },
      String(body.version ?? 'v1'),
    );
    return Response.json(res);
  } catch (e) { return errorResponse(e); }
}
