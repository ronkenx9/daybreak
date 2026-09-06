import { requireUser, errorResponse, HttpError } from '@/lib/account/auth-server';
import { getAccount, updateProfile } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const account = await getAccount(user.id);
    return Response.json({ userId: user.id, ...account });
  } catch (e) { return errorResponse(e); }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const version = Number(body.version);
    if (!Number.isInteger(version)) throw new HttpError(400, 'A profile version is required');
    const fields: { displayName?: string; avatar?: number } = {};
    if (typeof body.displayName === 'string') fields.displayName = body.displayName;
    if (typeof body.avatar === 'number') fields.avatar = body.avatar;
    const res = await updateProfile(user.id, fields, version);
    if (res.conflict) return Response.json({ error: 'Your profile changed on another device.' }, { status: 409 });
    return Response.json({ profile: res.profile });
  } catch (e) { return errorResponse(e); }
}
