import { errorResponse, HttpError, readJsonObject, requireUserOwningWallet } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { BASE_USDC } from '@/lib/base/economy-payment';
import { DAYC_TREASURY, isPinSinkConfigured } from '@/lib/base/daybreak-token';
import { createCreditQuote, CREDIT_PACKS } from '@/lib/db/repo-economy';

export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    if (!isPinSinkConfigured) throw new HttpError(503, 'Credit payments are unavailable.');
    const body = await readJsonObject(req);
    if (typeof body.wallet !== 'string' || !CREDIT_PACKS.includes(body.creditsCents as typeof CREDIT_PACKS[number])) throw new HttpError(400, 'Choose a valid pack and linked wallet.');
    const { user, walletAddress } = await requireUserOwningWallet(req, body.wallet);
    requireWriteCapacity(user.id);
    const quote = await createCreditQuote(user.id, walletAddress, Number(body.creditsCents));
    return Response.json({ quote, token: BASE_USDC, treasury: DAYC_TREASURY, symbol: 'USDC', chainId: 8453 }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
