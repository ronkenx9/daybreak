import { errorResponse, HttpError, readJsonObject, requireUserOwningWallet } from '@/lib/account/auth-server';
import { createKeyedRateLimit } from '@/lib/server/requests';
import { readDaycBalance, daycTier } from '@/lib/base/dayc-gate';
import { DAYC_MEMBER_MIN } from '@/lib/base/daybreak-token';

export const dynamic = 'force-dynamic';
const canCheck = createKeyedRateLimit(10, 60_000);

export async function POST(req: Request) {
  try {
    const body = await readJsonObject(req);
    if (typeof body.address !== 'string') throw new HttpError(400, 'Invalid wallet address');
    // Proves the wallet is linked to the signed-in account, exactly like /api/holdings/sync.
    const { user, walletAddress } = await requireUserOwningWallet(req, body.address);
    if (!canCheck(user.id)) throw new HttpError(429, 'Checked recently. Try again shortly');
    const raw = await readDaycBalance(walletAddress);
    const tier = daycTier(raw);
    // The caller owns this wallet, so returning their own balance is not a leak.
    const balance = Number(raw) / 10 ** 18;
    return Response.json({ tier, threshold: DAYC_MEMBER_MIN, balance }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
