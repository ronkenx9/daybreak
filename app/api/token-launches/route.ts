import { requireUserWithWallet, errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { deployToken, BankrHttpError } from '@/lib/bankr/client';
import { isBankrConfigured } from '@/lib/bankr/config';
import { bankrLaunchRequest, launchHash, normalizeLaunchIntent } from '@/lib/bankr/launches';
import { claimLaunchForDeployment, getLaunchIntent, setLaunchStatus } from '@/lib/db/repo';
import { createKeyedRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';
const canDeploy = createKeyedRateLimit(1, 24 * 60 * 60_000);

export async function POST(req: Request) {
  let record: Awaited<ReturnType<typeof getLaunchIntent>> | null = null;
  try {
    if (!isBankrConfigured) throw new HttpError(503, 'Token launches are not configured');
    const { user, walletAddress } = await requireUserWithWallet(req); requireWriteCapacity(user.id);
    const body = await readJsonObject(req);
    const intent = normalizeLaunchIntent(body);
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
    const fingerprint = typeof body.fingerprint === 'string' ? body.fingerprint : '';
    if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey) || !/^[0-9a-f]{64}$/i.test(fingerprint)) throw new HttpError(400, 'Launch preview is missing');
    record = await getLaunchIntent(user.id, idempotencyKey);
    if (!record || record.intentHash !== launchHash(user.id, walletAddress, intent) || record.fingerprint !== fingerprint) throw new HttpError(409, 'This launch changed. Create a fresh preview');
    if (record.operationStatus !== 'quoted') throw new HttpError(409, record.operationStatus === 'confirmed' ? 'This token has already launched' : 'This launch is already being processed');
    if (!canDeploy(user.id)) throw new HttpError(429, 'Daybreak currently allows one launch per account every 24 hours');
    if (!await claimLaunchForDeployment(record.operationId, record.launchId)) throw new HttpError(409, 'This launch is already being processed');
    const result = await deployToken(bankrLaunchRequest(intent, walletAddress, false));
    if (!result.success || !result.txHash || !result.tokenAddress || !result.poolId) throw new Error('UNKNOWN_DEPLOY_RESULT');
    await setLaunchStatus({ operationId: record.operationId, launchId: record.launchId, status: 'confirmed', txHash: result.txHash, tokenAddress: result.tokenAddress, poolId: result.poolId, ticker: intent.ticker });
    return Response.json({ success: true, tokenAddress: result.tokenAddress, poolId: result.poolId, txHash: result.txHash, chain: 'base', ticker: intent.ticker });
  } catch (error) {
    if (record && !(error instanceof HttpError)) await setLaunchStatus({ operationId: record.operationId, launchId: record.launchId, status: error instanceof BankrHttpError && error.status < 500 ? 'failed' : 'unknown', errorClass: error instanceof BankrHttpError ? error.code : 'unknown' }).catch(() => {});
    if (error instanceof BankrHttpError) return Response.json({ error: error.status === 401 || error.status === 403 ? 'This Bankr wallet is not eligible to deploy yet' : error.message }, { status: error.status === 401 || error.status === 403 ? 503 : error.status });
    if (error instanceof Error && error.message === 'UNKNOWN_DEPLOY_RESULT') return Response.json({ error: 'Bankr did not return a complete receipt. Check launch status before retrying' }, { status: 502 });
    return errorResponse(error);
  }
}
