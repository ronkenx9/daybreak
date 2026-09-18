import { errorResponse, HttpError, readJsonObject, requireUserOwningSolanaWallet } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { syncSolanaHoldingEligibility } from '@/lib/db/repo';
import { createKeyedRateLimit } from '@/lib/server/requests';
import { readSolanaXstockHoldings } from '@/lib/solana/holdings';

export const dynamic = 'force-dynamic';
const canSync = createKeyedRateLimit(6, 60_000);

export async function POST(req: Request) {
  try {
    const body = await readJsonObject(req);
    if (typeof body.address !== 'string') throw new HttpError(400, 'Invalid Solana wallet address');
    const { user, walletAddress } = await requireUserOwningSolanaWallet(req, body.address);
    requireWriteCapacity(user.id);
    if (!canSync(user.id)) throw new HttpError(429, 'Holdings were refreshed recently. Try again shortly');
    const snapshot = await readSolanaXstockHoldings(walletAddress);
    const eligibility = await syncSolanaHoldingEligibility(user.id, walletAddress, snapshot);
    return Response.json({ eligibility }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
