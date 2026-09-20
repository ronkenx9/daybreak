import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { verifyCreditPayment } from '@/lib/base/economy-payment';
import { confirmCreditPurchase, getEconomyAccount, readCreditQuote } from '@/lib/db/repo-economy';

export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    const body = await readJsonObject(req);
    if (typeof body.quoteId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.quoteId) || typeof body.txHash !== 'string' || !/^0x[0-9a-f]{64}$/i.test(body.txHash)) throw new HttpError(400, 'Invalid payment details.');
    const quote = await readCreditQuote(user.id, body.quoteId);
    if (!quote) throw new HttpError(404, 'Credit quote not found.');
    // Once an exact USDC transfer is signed, the fixed-price quote remains redeemable
    // even if the chain or confirmation step takes longer than the UI quote window.
    const verified = await verifyCreditPayment(body.txHash, quote.wallet, BigInt(quote.amountRaw), quote.createdAt);
    if (!verified.ok) throw new HttpError(409, verified.reason);
    const result = await confirmCreditPurchase(user.id, quote.id, body.txHash);
    return Response.json({ ...result, account: await getEconomyAccount(user.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
