import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { listCreditRefunds, requestCreditRefund } from '@/lib/db/repo-economy';
import { economyReviewConfigured } from '@/lib/economy/config';

export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try { const user = await requireUser(req); return Response.json({ ...(await listCreditRefunds(user.id)), reviewAvailable: economyReviewConfigured() }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(req: Request) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    if (!economyReviewConfigured()) throw new HttpError(503, 'Refund review is temporarily unavailable. Your credits remain available.');
    const body = await readJsonObject(req);
    if (typeof body.paymentTxHash !== 'string' || !/^0x[0-9a-f]{64}$/i.test(body.paymentTxHash) || !Number.isInteger(body.amountCents) || typeof body.reason !== 'string') throw new HttpError(400, 'Choose a purchase, amount and reason.');
    return Response.json({ request: await requestCreditRefund(user.id, body.paymentTxHash.toLowerCase(), Number(body.amountCents), body.reason) }, { status: 201 });
  } catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(409, error.message) : error); }
}
