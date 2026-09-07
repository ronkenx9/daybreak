import { requireUser, errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { blockByDiscovery } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    requireWriteCapacity(user.id);
    const { discoveryId } = await readJsonObject(req);
    if (typeof discoveryId !== 'string') throw new HttpError(400, 'Invalid discovery');
    const res = await blockByDiscovery(user.id, discoveryId);
    if (!res.ok) throw new HttpError(400, 'That author could not be blocked.');
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
