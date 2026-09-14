import { createRequestCache, createRateLimit } from '@/lib/server/requests';
import { fetchPairingIntelligence, parsePairingQuery, type PairingIntelligence } from '@/lib/data/pairing-opportunities';
import { requirePairingPayment, X402_NETWORK, X402_PRICE_USD } from '@/lib/x402/gateway';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cached = createRequestCache<PairingIntelligence>(180_000, 4, 1);
const allowed = createRateLimit(120);

export async function GET(request: Request) {
  if (!allowed()) return Response.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });

  let query;
  try {
    query = parsePairingQuery(request.url);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid query' }, { status: 400 });
  }

  const authorization = await requirePairingPayment(request);
  if (authorization.response) return authorization.response;

  try {
    const key = `${query.window}:${query.minLiquidity}:${query.limit}`;
    const data = await cached(key, () => fetchPairingIntelligence(query));
    const headers = new Headers({
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'X-Daybreak-Data-Version': data.methodologyVersion,
      'X-Daybreak-Price': X402_PRICE_USD,
      'X-Daybreak-Payment-Network': X402_NETWORK,
    });
    if (authorization.paymentResponseHeader) headers.set('PAYMENT-RESPONSE', authorization.paymentResponseHeader);
    return Response.json({
      ...data,
      payment: {
        protocol: 'x402',
        network: authorization.payment?.network ?? X402_NETWORK,
        amountAtomicUsdc: authorization.payment?.amount ?? '5000',
        payer: authorization.payment?.payer ?? null,
        transaction: authorization.payment?.transaction ?? null,
      },
    }, { headers });
  } catch {
    return Response.json({ error: 'Pairing intelligence is temporarily unavailable' }, { status: 503, headers: { 'Retry-After': '30' } });
  }
}
