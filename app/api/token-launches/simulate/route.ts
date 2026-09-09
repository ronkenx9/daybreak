import { randomUUID } from 'node:crypto';
import { requireUserWithWallet, errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { deployToken, BankrHttpError } from '@/lib/bankr/client';
import { BANKR_AUTH_MODE, isBankrConfigured } from '@/lib/bankr/config';
import { bankrLaunchRequest, launchFingerprint, launchHash, normalizeLaunchIntent } from '@/lib/bankr/launches';
import { recordLaunchSimulation } from '@/lib/db/repo';
import { createKeyedRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';
const canSimulate = createKeyedRateLimit(12, 60 * 60_000);

export async function POST(req: Request) {
  try {
    if (!isBankrConfigured) throw new HttpError(503, 'Token launches are not configured');
    const { user, walletAddress } = await requireUserWithWallet(req); requireWriteCapacity(user.id);
    if (!canSimulate(user.id)) throw new HttpError(429, 'Simulation limit reached. Try again later');
    const intent = normalizeLaunchIntent(await readJsonObject(req));
    const result = await deployToken(bankrLaunchRequest(intent, walletAddress, true));
    if (!result.success || !result.simulated || !result.tokenAddress || !result.poolId) throw new HttpError(502, 'Bankr returned an incomplete launch preview');
    const intentHash = launchHash(user.id, walletAddress, intent);
    const fingerprint = launchFingerprint(intentHash, result.tokenAddress, result.poolId);
    const idempotencyKey = randomUUID();
    const allocation = BANKR_AUTH_MODE === 'partner' ? '100% pool' : '85% pool · 15% creator vesting';
    await recordLaunchSimulation({ userId: user.id, idempotencyKey, intentHash, ticker: intent.ticker, feeRecipient: walletAddress, fingerprint, tokenAddress: result.tokenAddress, poolId: result.poolId, allocation });
    const feeDistribution = Object.fromEntries(Object.entries(result.feeDistribution ?? {}).map(([role, fee]) => [role, { bps: Number(fee?.bps ?? 0) }]));
    return Response.json({
      simulated: true, idempotencyKey, fingerprint, tokenAddress: result.tokenAddress,
      poolId: result.poolId, chain: 'base', ticker: intent.ticker, feeRecipient: walletAddress,
      feeDistribution, supply: '100,000,000,000', allocation,
      vesting: BANKR_AUTH_MODE === 'partner' ? 'None' : '1 year · 30-day cliff',
    });
  } catch (error) {
    if (error instanceof BankrHttpError) return Response.json({ error: error.status === 401 || error.status === 403 ? 'This Bankr wallet is not eligible to launch yet' : error.message }, { status: error.status === 401 || error.status === 403 ? 503 : error.status });
    if (error instanceof Error && error.message === 'DUPLICATE_LAUNCH_INTENT') return Response.json({ error: 'Create a fresh preview before launching' }, { status: 409 });
    return errorResponse(error);
  }
}
