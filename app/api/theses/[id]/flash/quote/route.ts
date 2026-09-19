import { createHash } from 'node:crypto';
import { requireUserOwningSolanaWallet, readJsonObject, errorResponse, HttpError } from '@/lib/account/auth-server';
import { getPublicThesis } from '@/lib/db/repo-theses';
import { buildSetupTransaction, decimalAmount, flashConfigured, flashOrderFields, flashPost, sealIntent, type FlashIntent } from '@/lib/flash/stock-order';
import { requireThesisInstrument } from '@/lib/theses/instruments';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET() {
  return Response.json({ configured: flashConfigured() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, context: Context) {
  try {
    const body = await readJsonObject(request, 2_000);
    const { user, walletAddress } = await requireUserOwningSolanaWallet(request, typeof body.wallet === 'string' ? body.wallet : '');
    const { id } = await context.params;
    const thesis = await getPublicThesis(id);
    if (!thesis || thesis.mode !== 'live' || !thesis.publishedAt) throw new HttpError(404, 'Live thesis not found');
    const instrument = requireThesisInstrument(thesis.instrumentId);
    const qty = decimalAmount(body.amount, 6, 10_000);
    const limitCrossPrice = decimalAmount(body.limitPrice, 6, 1_000_000);
    const terms = { wallet: walletAddress, mint: instrument.mint, qty, limitCrossPrice };
    const expireTime = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
    const quote = await flashPost('/quote', { ...flashOrderFields(terms), forceMinimalAllowance: true, expireTime });
    if (quote.targetAsset !== instrument.mint || quote.contraAsset !== 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' || quote.side !== 'buy' || quote.orderType !== 'limit') throw new HttpError(502, 'Flash returned a different asset pair');
    const svm = quote.svm as Record<string, unknown> | null;
    if (!svm || typeof quote.quoteId !== 'string' || typeof svm.orderMessage !== 'string' || typeof svm.nonce !== 'string' || !['string','number'].includes(typeof svm.deadline) || quote.wrap) throw new HttpError(502, 'Flash returned an incomplete Solana order');
    const setupTransactionBase64 = await buildSetupTransaction(svm, walletAddress, instrument.mint, qty);
    const intent: FlashIntent = {
      version: 1, userId: user.id, thesisId: thesis.id, wallet: walletAddress,
      mint: instrument.mint, qty, limitCrossPrice, quoteId: quote.quoteId,
      orderMessage: svm.orderMessage, nonce: svm.nonce, deadline: String(svm.deadline), expireTime,
      setupMessageHash: setupTransactionBase64 ? createHash('sha256').update(setupTransactionBase64).digest('hex') : null,
      issuedAt: Date.now(),
    };
    const from = quote.from as { amount?: unknown } | undefined;
    const to = quote.to as { amount?: unknown } | undefined;
    const fees = quote.fees as { estimatedFeeNotional?: unknown } | undefined;
    return Response.json({
      review: sealIntent(intent), setupTransactionBase64,
      wallet: walletAddress, ticker: instrument.ticker, stockSymbol: instrument.symbol,
      stockMint: instrument.mint, spendAmount: qty, limitPrice: limitCrossPrice,
      estimatedReceive: typeof to?.amount === 'string' ? to.amount : null,
      estimatedSpend: typeof from?.amount === 'string' ? from.amount : qty,
      estimatedFeeUsd: typeof fees?.estimatedFeeNotional === 'string' ? fees.estimatedFeeNotional : null,
      orderMessage: svm.orderMessage, deadline: intent.deadline,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
