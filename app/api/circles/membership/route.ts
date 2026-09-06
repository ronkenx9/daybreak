import { requireUser, errorResponse, HttpError } from '@/lib/account/auth-server';
import { joinCircle, leaveCircle } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { slug } = await req.json().catch(() => ({}));
    const res = await joinCircle(user.id, String(slug ?? ''));
    if (!res.ok) throw new HttpError(400, 'Unknown circle');
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    const slug = new URL(req.url).searchParams.get('slug') ?? '';
    await leaveCircle(user.id, slug);
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
