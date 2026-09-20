import { errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { verifyCreditRefund } from '@/lib/base/economy-payment';
import { readPendingCreditRefund, resolveCreditRefund } from '@/lib/db/repo-economy';
import { requireEconomyAdmin } from '@/lib/economy/admin';

export const dynamic = 'force-dynamic';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireEconomyAdmin(req);
    const { id } = await params; const body = await readJsonObject(req);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !['processing','fulfilled','denied'].includes(String(body.decision)) || typeof body.note !== 'string') throw new HttpError(400, 'Invalid refund decision.');
    const request = await readPendingCreditRefund(id);
    if (!request) throw new HttpError(409, 'Refund request is no longer pending.');
    const decision = body.decision as 'processing' | 'fulfilled' | 'denied';
    const txHash = typeof body.refundTxHash === 'string' ? body.refundTxHash : undefined;
    if (decision === 'fulfilled') {
      if (!txHash) throw new HttpError(400, 'A Base USDC refund transaction is required.');
      const proof = await verifyCreditRefund(txHash, request.wallet, BigInt(request.amountCents) * 10_000n, request.createdAt);
      if (!proof.ok) throw new HttpError(409, proof.reason);
    }
    return Response.json(await resolveCreditRefund(id, decision, admin.id, body.note, txHash));
  } catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(409, error.message) : error); }
}
