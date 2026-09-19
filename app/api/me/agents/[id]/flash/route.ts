import { PublicKey } from '@solana/web3.js';
import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { configureOwnedAgentFlash } from '@/lib/db/repo-agents';
import { AgentApiError } from '@/lib/agents/errors';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    const body = await readJsonObject(request, 1_024);
    if (typeof body.enabled !== 'boolean') throw new HttpError(400, 'Choose whether to enable live Flash orders');
    let wallet: string | null = null;
    if (body.enabled) {
      if (typeof body.wallet !== 'string') throw new HttpError(400, 'Enter a dedicated Solana wallet address');
      try {
        const key = new PublicKey(body.wallet);
        if (key.toBase58() !== body.wallet || !PublicKey.isOnCurve(key.toBytes())) throw new Error();
        wallet = key.toBase58();
      } catch { throw new HttpError(400, 'Enter a standard Ed25519 Solana wallet address'); }
    }
    const maxUsdcPerOrder = Number(body.maxUsdcPerOrder ?? 5);
    const dailyUsdc = Number(body.dailyUsdc ?? 25);
    if (!Number.isFinite(maxUsdcPerOrder) || maxUsdcPerOrder <= 0 || maxUsdcPerOrder > 100 || !Number.isFinite(dailyUsdc) || dailyUsdc < maxUsdcPerOrder || dailyUsdc > 500 || Math.round(maxUsdcPerOrder * 1e6) !== maxUsdcPerOrder * 1e6 || Math.round(dailyUsdc * 1e6) !== dailyUsdc * 1e6) throw new HttpError(400, 'Live limits must be positive USDC amounts (max 100/order, 500/day)');
    const policy = await configureOwnedAgentFlash(user.id, (await context.params).id, { enabled: body.enabled, wallet, maxUsdcPerOrder, dailyUsdc });
    return Response.json({ policy }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return error instanceof AgentApiError ? Response.json({ error: error.message }, { status: error.status }) : errorResponse(error); }
}
