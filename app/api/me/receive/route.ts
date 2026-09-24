import { errorResponse, HttpError, readJsonObject, requireUser, requireUserWithWallet } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { getReceiveOptIn, setReceiveOptIn } from '@/lib/db/repo-send';

export const dynamic = 'force-dynamic';

// Whether fellow circle members may send this user stock. The wallet comes from Privy's
// verified identity, never from the browser.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return Response.json({ enabled: await getReceiveOptIn(user.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(req: Request) {
  try {
    const body = await readJsonObject(req);
    if (typeof body.enabled !== 'boolean') throw new HttpError(400, 'enabled must be true or false');
    const { user, walletAddress } = await requireUserWithWallet(req);
    requireWriteCapacity(user.id);
    return Response.json({ enabled: await setReceiveOptIn(user.id, walletAddress, body.enabled) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
