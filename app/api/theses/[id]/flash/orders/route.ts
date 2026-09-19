import { requireUserOwningSolanaWallet, errorResponse, HttpError } from '@/lib/account/auth-server';
import { getPublicThesis } from '@/lib/db/repo-theses';
import { flashOrders } from '@/lib/flash/stock-order';
import { USDC_SOLANA_MINT } from '@/lib/solana/xstocks-registry';
import { requireThesisInstrument } from '@/lib/theses/instruments';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const wallet = new URL(request.url).searchParams.get('wallet') ?? '';
    await requireUserOwningSolanaWallet(request, wallet);
    const thesis = await getPublicThesis((await context.params).id);
    if (!thesis || thesis.mode !== 'live') throw new HttpError(404, 'Live thesis not found');
    const instrument = requireThesisInstrument(thesis.instrumentId);
    const raw = await flashOrders(wallet);
    const orders = raw.filter(order => {
      const target = order.targetAsset as { address?: unknown } | undefined;
      const contra = order.contraAsset as { address?: unknown } | undefined;
      return order.funderAddress === wallet && order.orderType === 'limit' && order.side === 'buy' && target?.address === instrument.mint && contra?.address === USDC_SOLANA_MINT;
    }).slice(0, 10).map(order => ({
      orderId: String(order.orderId), status: String(order.status || 'unknown'),
      qty: String(order.qty || ''), limitCrossPrice: String(order.limitCrossPrice || ''),
      placedAt: typeof order.placedAt === 'string' ? order.placedAt : null,
    }));
    return Response.json({ orders }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
