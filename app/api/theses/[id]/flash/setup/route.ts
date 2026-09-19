import { createHash } from 'node:crypto';
import bs58 from 'bs58';
import { requireUserOwningSolanaWallet, readJsonObject, errorResponse, HttpError } from '@/lib/account/auth-server';
import { getPublicThesis } from '@/lib/db/repo-theses';
import { openIntent, verifySignedSetup } from '@/lib/flash/stock-order';
import { solanaConnection } from '@/lib/solana/client';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const body = await readJsonObject(request, 25_000);
    const intent = openIntent(body.review);
    const { user } = await requireUserOwningSolanaWallet(request, intent.wallet);
    const thesis = await getPublicThesis((await context.params).id);
    if (intent.userId !== user.id || !thesis || thesis.id !== intent.thesisId || thesis.mode !== 'live') throw new HttpError(409, 'Order review does not match this thesis');
    const unsigned = typeof body.unsignedTransaction === 'string' ? body.unsignedTransaction : '';
    const signed = typeof body.signedTransaction === 'string' ? body.signedTransaction : '';
    if (!intent.setupMessageHash || !unsigned || !signed || unsigned.length > 10_000 || signed.length > 10_000 || createHash('sha256').update(unsigned).digest('hex') !== intent.setupMessageHash) throw new HttpError(400, 'Setup differs from the reviewed order');
    const tx = verifySignedSetup(unsigned, signed, intent.wallet);
    const signature = bs58.encode(tx.signature!);
    const connection = solanaConnection();
    const sent = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
    if (sent !== signature) throw new HttpError(502, 'Solana returned a different setup signature');
    const status = await connection.confirmTransaction(signature, 'confirmed');
    if (status.value.err) throw new HttpError(502, 'Token setup was rejected on Solana');
    return Response.json({ signature, status: 'confirmed' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
