import bs58 from 'bs58';
import { Transaction } from '@solana/web3.js';
import { requireUser, requireUserOwningSolanaWallet, readJsonObject, errorResponse, HttpError } from '@/lib/account/auth-server';
import { claimThesisSubmission, getThesisSubmission, setThesisSubmissionStatus } from '@/lib/db/repo-theses';
import { transactionMessageHash } from '@/lib/theses/model';
import { solanaConnection } from '@/lib/solana/client';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const stored = await getThesisSubmission(id, user.id);
    if (!stored) throw new HttpError(404, 'Thesis operation not found');
    return Response.json({
      thesisId: stored.thesis.id,
      status: stored.market.status,
      signature: stored.market.txSignature,
      poolAddress: stored.market.poolAddress,
      baseMint: stored.market.baseMint,
      quoteMint: stored.market.quoteMint,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: Context) {
  let thesisId = '';
  let userId = '';
  let submittedSignature = '';
  try {
    const body = await readJsonObject(request, 16_000);
    const b64 = typeof body.signedTransaction === 'string' ? body.signedTransaction : '';
    if (!b64 || b64.length > 14_000) throw new HttpError(400, 'Missing signed transaction');
    const user = await requireUser(request);
    userId = user.id;
    thesisId = (await context.params).id;
    const stored = await getThesisSubmission(thesisId, user.id);
    if (!stored) throw new HttpError(404, 'Thesis operation not found');
    await requireUserOwningSolanaWallet(request, stored.market.creatorWallet);
    if (stored.market.status === 'active') return Response.json({
      status: 'active', signature: stored.market.txSignature, poolAddress: stored.market.poolAddress,
      baseMint: stored.market.baseMint, quoteMint: stored.market.quoteMint,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
    if (stored.market.status !== 'preview') throw new HttpError(409, 'This thesis launch is already being processed');

    let transaction: Transaction;
    try { transaction = Transaction.from(Buffer.from(b64, 'base64')); }
    catch { throw new HttpError(400, 'Invalid signed transaction'); }
    if (transaction.feePayer?.toBase58() !== stored.market.creatorWallet) throw new HttpError(409, 'Transaction signer does not match the reviewed wallet');
    if (transaction.recentBlockhash !== stored.market.recentBlockhash) throw new HttpError(409, 'Transaction blockhash changed after review');
    if (transactionMessageHash(transaction.serializeMessage()) !== stored.market.transactionMessageHash) throw new HttpError(409, 'Transaction instructions changed after review');
    if (!transaction.verifySignatures(true) || !transaction.signature) throw new HttpError(400, 'All required signatures are not present');
    submittedSignature = bs58.encode(transaction.signature);

    const claim = await claimThesisSubmission(thesisId, user.id);
    if (claim === 'limit') throw new HttpError(429, 'Daybreak currently allows one thesis market per account every 24 hours');
    if (claim !== 'claimed') throw new HttpError(409, 'This thesis launch is already being processed');

    const connection = solanaConnection();
    const networkSignature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, maxRetries: 3 });
    if (networkSignature !== submittedSignature) throw new Error('RPC returned a different transaction signature');
    await setThesisSubmissionStatus({ thesisId, userId: user.id, status: 'submitted', signature: submittedSignature });
    const confirmation = await connection.confirmTransaction({
      signature: submittedSignature,
      blockhash: stored.market.recentBlockhash,
      lastValidBlockHeight: stored.market.lastValidBlockHeight,
    }, 'confirmed');
    if (confirmation.value.err) {
      await setThesisSubmissionStatus({ thesisId, userId: user.id, status: 'failed', signature: submittedSignature, errorClass: 'chain_error' });
      throw new HttpError(502, 'The network rejected this thesis market transaction');
    }
    await setThesisSubmissionStatus({ thesisId, userId: user.id, status: 'active', signature: submittedSignature });
    return Response.json({
      status: 'active', signature: submittedSignature, slug: stored.thesis.slug,
      poolAddress: stored.market.poolAddress, baseMint: stored.market.baseMint, quoteMint: stored.market.quoteMint,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (thesisId && userId && submittedSignature && !(error instanceof HttpError)) {
      await setThesisSubmissionStatus({ thesisId, userId, status: 'unknown', signature: submittedSignature, errorClass: 'rpc_unknown' }).catch(() => {});
      return Response.json({ error: 'Submission status is uncertain. Daybreak will check this signature before another launch.', status: 'unknown', signature: submittedSignature }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } });
    }
    return errorResponse(error);
  }
}
