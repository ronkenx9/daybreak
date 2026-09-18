import { errorResponse, HttpError, readJsonObject, requireUserOwningSolanaWallet } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { syncPreStockHoldingEligibility, syncSolanaHoldingEligibility } from '@/lib/db/repo';
import { createKeyedRateLimit } from '@/lib/server/requests';
import { readSolanaXstockHoldings } from '@/lib/solana/holdings';
import { readPreStockHoldings } from '@/lib/solana/prestocks-holdings';

export const dynamic = 'force-dynamic';
const canSync = createKeyedRateLimit(6, 60_000);

export async function POST(req: Request) {
  try {
    const body = await readJsonObject(req);
    if (typeof body.address !== 'string') throw new HttpError(400, 'Invalid Solana wallet address');
    const { user, walletAddress } = await requireUserOwningSolanaWallet(req, body.address);
    requireWriteCapacity(user.id);
    if (!canSync(user.id)) throw new HttpError(429, 'Holdings were refreshed recently. Try again shortly');
    const reads = await Promise.allSettled([
      readSolanaXstockHoldings(walletAddress),
      readPreStockHoldings(walletAddress),
    ]);
    const [xstocks, prestocks] = reads;
    if (xstocks.status === 'rejected' && prestocks.status === 'rejected') throw new HttpError(502, 'Solana holdings are unavailable right now');
    const synced = [] as Array<{ tickers: string[]; expiresAt: string; status: string }>;
    if (xstocks.status === 'fulfilled') synced.push(await syncSolanaHoldingEligibility(user.id, walletAddress, xstocks.value));
    if (prestocks.status === 'fulfilled') synced.push(await syncPreStockHoldingEligibility(user.id, walletAddress, prestocks.value));
    const tickers = [...new Set(synced.flatMap((result) => result.tickers))];
    const expiresAt = synced.map((result) => result.expiresAt).sort().at(-1) ?? new Date().toISOString();
    return Response.json({
      eligibility: { tickers, expiresAt, status: reads.every((result) => result.status === 'fulfilled') ? 'complete' : 'partial' },
      coverage: { xstocks: xstocks.status === 'fulfilled', prestocks: prestocks.status === 'fulfilled' },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
