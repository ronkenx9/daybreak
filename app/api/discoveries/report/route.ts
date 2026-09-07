import { requireUser, errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { reportDiscovery } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    requireWriteCapacity(user.id);
    const { discoveryId, reason } = await readJsonObject(req);
    if (typeof discoveryId !== 'string') throw new HttpError(400, 'Invalid discovery');
    const res = await reportDiscovery(user.id, discoveryId, typeof reason === 'string' ? reason : undefined);
    if (!res.ok) throw new HttpError(400, 'That report could not be filed.');
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
