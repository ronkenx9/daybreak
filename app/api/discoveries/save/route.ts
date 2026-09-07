import { requireUser, errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { saveDiscovery, unsaveDiscovery } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    requireWriteCapacity(user.id);
    const { discoveryId } = await readJsonObject(req);
    if (typeof discoveryId !== 'string') throw new HttpError(400, 'Invalid discovery');
    const res = await saveDiscovery(user.id, discoveryId);
    if (!res.ok) throw new HttpError(400, 'That discovery could not be saved.');
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    requireWriteCapacity(user.id);
    await unsaveDiscovery(user.id, new URL(req.url).searchParams.get('discoveryId') ?? '');
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
