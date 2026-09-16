import { errorResponse, HttpError, readJsonObject, requireUserOwningWallet } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { createKeyedRateLimit } from '@/lib/server/requests';
import { verifyDaycPinPayment } from '@/lib/base/dayc-pin';
import { pinCircle } from '@/lib/db/repo';
import { DAYC_PIN_HOURS } from '@/lib/base/daybreak-token';

export const dynamic = 'force-dynamic';
const canPin = createKeyedRateLimit(5, 60_000);

export async function POST(req: Request) {
  try {
    const body = await readJsonObject(req);
    if (typeof body.slug !== 'string' || typeof body.txHash !== 'string' || typeof body.from !== 'string') {
      throw new HttpError(400, 'Missing pin details');
    }
    // Proves the payer wallet belongs to the signed-in account.
    const { user, walletAddress } = await requireUserOwningWallet(req, body.from);
    requireWriteCapacity(user.id);
    if (!canPin(user.id)) throw new HttpError(429, 'Try again shortly');
    const check = await verifyDaycPinPayment(body.txHash, [walletAddress]);
    if (!check.ok) throw new HttpError(400, check.reason || 'Payment could not be verified');
    const pinned = await pinCircle(user.id, body.slug, body.txHash, check.amountRaw!, DAYC_PIN_HOURS);
    if (!pinned) throw new HttpError(409, 'This payment was already used, or the circle is unavailable');
    return Response.json({ pinned: true, hours: DAYC_PIN_HOURS }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
