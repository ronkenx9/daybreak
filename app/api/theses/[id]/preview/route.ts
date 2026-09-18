import { randomUUID } from 'node:crypto';
import { Transaction } from '@solana/web3.js';
import { requireUserOwningSolanaWallet, readJsonObject, errorResponse, HttpError } from '@/lib/account/auth-server';
import { getOwnedThesis, recordThesisPreview } from '@/lib/db/repo-theses';
import { buildThesisLaunchTransaction } from '@/lib/solana/dbc/launch';
import { thesisIntentHash, transactionMessageHash } from '@/lib/theses/model';
import { requireThesisInstrument } from '@/lib/theses/instruments';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: Context) {
  try {
    const body = await readJsonObject(request, 2_000);
    const creator = typeof body.creator === 'string' ? body.creator : '';
    const { user, walletAddress } = await requireUserOwningSolanaWallet(request, creator);
    const { id } = await context.params;
    const thesis = await getOwnedThesis(id, user.id);
    if (!thesis || !['draft', 'ready'].includes(thesis.status)) throw new HttpError(409, 'This thesis cannot create a new preview');
    const instrument = requireThesisInstrument(thesis.instrumentId, 'create');
    if (instrument.companyId !== thesis.companyId) throw new HttpError(409, 'Thesis instrument identity changed');
    const build = await buildThesisLaunchTransaction({
      creator: walletAddress,
      instrumentId: thesis.instrumentId,
      name: thesis.tokenName,
      symbol: thesis.tokenSymbol,
      uri: `https://www.daybreakcircles.lol/api/theses/${thesis.id}/metadata`,
    });
    const transaction = Transaction.from(Buffer.from(build.transactionBase64, 'base64'));
    const messageHash = transactionMessageHash(transaction.serializeMessage());
    const idempotencyKey = typeof body.idempotencyKey === 'string' && UUID.test(body.idempotencyKey) ? body.idempotencyKey : randomUUID();
    const intentHash = thesisIntentHash({ thesisId: thesis.id, walletAddress, messageHash, poolAddress: build.poolAddress, configVersion: build.terms.version });
    await recordThesisPreview({ thesisId: thesis.id, userId: user.id, idempotencyKey, intentHash, wallet: walletAddress, messageHash, recentBlockhash: transaction.recentBlockhash!, build });
    return Response.json({ ...build, thesisId: thesis.id, slug: thesis.slug, idempotencyKey, intentHash }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_THESIS_INTENT') return errorResponse(new HttpError(409, 'This preview was already created'));
    if (error instanceof Error && !('status' in error)) return errorResponse(new HttpError(400, error.message));
    return errorResponse(error);
  }
}
