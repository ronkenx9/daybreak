import { requireUser, errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { joinCircle, leaveCircle } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    requireWriteCapacity(user.id);
    const { slug } = await readJsonObject(req);
    if (typeof slug !== 'string') throw new HttpError(400, 'Invalid circle');
    const res = await joinCircle(user.id, slug);
    if (!res.ok) throw new HttpError(400, 'Unknown circle');
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    requireWriteCapacity(user.id);
    const slug = new URL(req.url).searchParams.get('slug') ?? '';
    await leaveCircle(user.id, slug);
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
