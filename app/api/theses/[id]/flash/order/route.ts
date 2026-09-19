import { requireUserOwningSolanaWallet, readJsonObject, errorResponse, HttpError } from '@/lib/account/auth-server';
import { getPublicThesis } from '@/lib/db/repo-theses';
import { flashOrderFields, flashPost, openIntent, verifyOrderSignature } from '@/lib/flash/stock-order';
import { solanaConnection } from '@/lib/solana/client';
import { requireThesisInstrument } from '@/lib/theses/instruments';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const body = await readJsonObject(request, 15_000);
    const intent = openIntent(body.review);
    const { user } = await requireUserOwningSolanaWallet(request, intent.wallet);
    const thesis = await getPublicThesis((await context.params).id);
    if (intent.userId !== user.id || !thesis || thesis.id !== intent.thesisId || thesis.mode !== 'live' || !thesis.publishedAt) throw new HttpError(409, 'Order review does not match this thesis');
    const instrument = requireThesisInstrument(thesis.instrumentId);
    if (instrument.mint !== intent.mint) throw new HttpError(409, 'The paired stock token changed');
    if (intent.setupMessageHash) {
      const signature = typeof body.setupSignature === 'string' ? body.setupSignature : '';
      if (!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature)) throw new HttpError(409, 'Confirm wallet setup before placing this order');
      const result = await solanaConnection().getSignatureStatuses([signature], { searchTransactionHistory: true });
      const status = result.value[0];
      if (!status || status.err || !['confirmed', 'finalized'].includes(status.confirmationStatus || '')) throw new HttpError(409, 'Wallet setup has not confirmed');
    }
    const userSignature = typeof body.userSignature === 'string' ? body.userSignature : '';
    verifyOrderSignature(intent.orderMessage, userSignature, intent.wallet);
    const order = await flashPost('/order', {
      ...flashOrderFields(intent), quoteId: intent.quoteId, userSignature,
      svmNonce: intent.nonce, svmDeadline: intent.deadline, expireTime: intent.expireTime,
    });
    if (typeof order.orderId !== 'string' || !order.orderId) throw new HttpError(502, 'Flash did not return an order ID');
    return Response.json({ orderId: order.orderId, status: 'submitted', thesisId: thesis.id, stockSymbol: instrument.symbol }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
