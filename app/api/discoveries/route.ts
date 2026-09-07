import { requireUser, errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { createDiscovery, listCircleDiscoveries, removeDiscovery } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const slug = new URL(req.url).searchParams.get('circle') ?? '';
    const res = await listCircleDiscoveries(user.id, slug);
    if (!res.ok) throw new HttpError(403, 'Join this circle to see its discoveries.');
    return Response.json({ discoveries: res.discoveries });
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    requireWriteCapacity(user.id);
    const b = await readJsonObject(req);
    const res = await createDiscovery(user.id, {
      circleSlug: String(b.circleSlug ?? ''), subjectType: String(b.subjectType ?? ''), subjectId: String(b.subjectId ?? ''),
      subjectLabel: typeof b.subjectLabel === 'string' ? b.subjectLabel : undefined,
      note: typeof b.note === 'string' ? b.note : undefined,
    });
    if (!res.ok) throw new HttpError(res.reason === 'member' ? 403 : 400, res.reason === 'member' ? 'Join this circle to share here.' : 'That discovery could not be shared.');
    return Response.json({ ok: true, id: res.id });
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    requireWriteCapacity(user.id);
    await removeDiscovery(user.id, new URL(req.url).searchParams.get('id') ?? '');
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
