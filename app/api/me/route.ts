import { requireUser, errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { getAccount, updateProfile, updateProfilePhoto } from '@/lib/db/repo';
import { isValidProfileImage } from '@/lib/account/profile-image';

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
    requireWriteCapacity(user.id);
    const body = await readJsonObject(req, 180_000);
    const version = Number(body.version);
    if (!Number.isSafeInteger(version) || version < 1) throw new HttpError(400, 'A valid profile version is required');
    const fields: { displayName?: string; avatar?: number; avatarUrl?: string | null } = {};
    if (body.displayName !== undefined) {
      if (typeof body.displayName !== 'string' || body.displayName.trim().length < 1 || body.displayName.length > 24) throw new HttpError(400, 'Display name must be 1–24 characters');
      fields.displayName = body.displayName.trim();
    }
    if (body.avatar !== undefined) {
      if (!Number.isInteger(body.avatar) || Number(body.avatar) < 0 || Number(body.avatar) > 5) throw new HttpError(400, 'Invalid avatar');
      fields.avatar = Number(body.avatar);
    }
    if (body.avatarUrl !== undefined) {
      if (body.avatarUrl !== null && !isValidProfileImage(body.avatarUrl)) throw new HttpError(400, 'Profile photo must be a valid WebP image under 150 KB');
      fields.avatarUrl = body.avatarUrl;
    }
    if (fields.displayName === undefined && fields.avatar === undefined && fields.avatarUrl === undefined) throw new HttpError(400, 'No profile changes supplied');
    const res = fields.avatarUrl !== undefined
      ? await updateProfilePhoto(user.id, fields.avatarUrl, { displayName: fields.displayName, avatar: fields.avatar }, version)
      : await updateProfile(user.id, fields, version);
    if (res.conflict) return Response.json({ error: 'Your profile changed on another device.' }, { status: 409 });
    return Response.json({ profile: res.profile });
  } catch (e) { return errorResponse(e); }
}
