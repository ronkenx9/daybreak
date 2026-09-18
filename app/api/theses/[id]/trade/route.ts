import bs58 from 'bs58';
import { Transaction } from '@solana/web3.js';
import { requireUser, requireUserOwningSolanaWallet, readJsonObject, errorResponse, HttpError } from '@/lib/account/auth-server';
import { claimThesisTrade, getThesisTradeOperation, setThesisTradeStatus } from '@/lib/db/repo-theses';
import { transactionMessageHash } from '@/lib/theses/model';
import { solanaConnection } from '@/lib/solana/client';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    const quoteId = new URL(request.url).searchParams.get('quoteId') ?? '';
    if (!UUID.test(quoteId)) throw new HttpError(400, 'Invalid quote id');
    const stored = await getThesisTradeOperation((await context.params).id, quoteId, user.id);
    if (!stored) throw new HttpError(404, 'Trade operation not found');
    return Response.json({ quoteId, status: stored.quote.status, signature: stored.quote.txSignature, direction: stored.quote.direction }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: Context) {
  let quoteId = ''; let userId = ''; let signature = '';
  try {
    const body = await readJsonObject(request, 16_000);
    quoteId = typeof body.quoteId === 'string' ? body.quoteId : '';
    const signedTransaction = typeof body.signedTransaction === 'string' ? body.signedTransaction : '';
    if (!UUID.test(quoteId) || !signedTransaction || signedTransaction.length > 14_000) throw new HttpError(400, 'Missing signed trade review');
    const user = await requireUser(request); userId = user.id;
    const thesisId = (await context.params).id;
    const stored = await getThesisTradeOperation(thesisId, quoteId, user.id);
    if (!stored) throw new HttpError(404, 'Trade operation not found');
    await requireUserOwningSolanaWallet(request, stored.quote.walletAddress);
    if (stored.quote.status === 'confirmed') return Response.json({ status: 'confirmed', signature: stored.quote.txSignature, direction: stored.quote.direction }, { headers: { 'Cache-Control': 'private, no-store' } });
    if (stored.quote.status !== 'quoted') throw new HttpError(409, 'This trade is already being processed');
    if (stored.quote.expiresAt <= new Date()) throw new HttpError(409, 'This trade review expired; request a fresh quote');
    let transaction: Transaction;
    try { transaction = Transaction.from(Buffer.from(signedTransaction, 'base64')); } catch { throw new HttpError(400, 'Invalid signed transaction'); }
    if (transaction.feePayer?.toBase58() !== stored.quote.walletAddress) throw new HttpError(409, 'Transaction signer does not match the reviewed wallet');
    if (transaction.recentBlockhash !== stored.quote.recentBlockhash) throw new HttpError(409, 'Transaction blockhash changed after review');
    if (transactionMessageHash(transaction.serializeMessage()) !== stored.quote.transactionMessageHash) throw new HttpError(409, 'Transaction instructions changed after review');
    if (!transaction.verifySignatures(true) || !transaction.signature) throw new HttpError(400, 'The wallet signature is missing');
    signature = bs58.encode(transaction.signature);
    const claim = await claimThesisTrade(quoteId, user.id);
    if (claim === 'expired') throw new HttpError(409, 'This trade review expired; request a fresh quote');
    if (claim !== 'claimed') throw new HttpError(409, 'This trade is already being processed');
    const connection = solanaConnection();
    const networkSignature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, maxRetries: 3 });
    if (networkSignature !== signature) throw new Error('RPC returned a different transaction signature');
    await setThesisTradeStatus({ quoteId, userId: user.id, status: 'submitted', signature });
    const confirmation = await connection.confirmTransaction({ signature, blockhash: stored.quote.recentBlockhash, lastValidBlockHeight: stored.quote.lastValidBlockHeight }, 'confirmed');
    if (confirmation.value.err) {
      await setThesisTradeStatus({ quoteId, userId: user.id, status: 'failed', signature, errorClass: 'chain_error' });
      throw new HttpError(502, 'The network rejected this thesis trade');
    }
    await setThesisTradeStatus({ quoteId, userId: user.id, status: 'confirmed', signature });
    return Response.json({ status: 'confirmed', signature, direction: stored.quote.direction }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (quoteId && userId && signature && !(error instanceof HttpError)) {
      await setThesisTradeStatus({ quoteId, userId, status: 'unknown', signature, errorClass: 'rpc_unknown' }).catch(() => {});
      return Response.json({ error: 'Trade status is uncertain. Daybreak will preserve this signature for recovery.', status: 'unknown', signature }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } });
    }
    return errorResponse(error);
  }
}
