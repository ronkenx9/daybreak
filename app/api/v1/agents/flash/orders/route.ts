import { createHash } from 'node:crypto';
import bs58 from 'bs58';
import { requireFlashAgent, readAgentJson } from '@/lib/agents/auth';
import { AgentApiError, agentErrorResponse } from '@/lib/agents/errors';
import { requireIdempotencyKey } from '@/lib/agents/validation';
import { assertAgentFlashPolicy, listAgentFlashOrders, markAgentFlashOrder, reserveAgentFlashOrder, type AgentFlashIntent } from '@/lib/db/repo-agents';
import { getPublicThesis } from '@/lib/db/repo-theses';
import { flashOrderFields, flashOrders, flashPost, openIntent, verifyOrderSignature, verifySignedSetup } from '@/lib/flash/stock-order';
import { requireThesisInstrument } from '@/lib/theses/instruments';
import { solanaConnection } from '@/lib/solana/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const agent = await requireFlashAgent(request);
    const orders = await listAgentFlashOrders(agent);
    const flash = await flashOrders(agent.policy.liveFlashWallet!);
    const byId = new Map(flash.filter(order => typeof order.orderId === 'string').map(order => [String(order.orderId), order]));
    return Response.json({ orders: orders.map(order => ({ ...order, flashStatus: order.flashOrderId ? String(byId.get(order.flashOrderId)?.status ?? 'not returned in recent Flash orders') : null })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return agentErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const agent = await requireFlashAgent(request);
    const idempotencyKey = requireIdempotencyKey(request);
    const body = await readAgentJson(request, 25_000);
    const intent = openIntent(body.review);
    if (intent.userId !== `agent:${agent.actorId}` || intent.actorId !== agent.actorId || !intent.instrumentId || !Number.isInteger(intent.policyVersion)) throw new AgentApiError('INVALID_INPUT', 'This review belongs to another agent');
    assertAgentFlashPolicy(agent, { instrumentId: intent.instrumentId, wallet: intent.wallet, qty: intent.qty, policyVersion: intent.policyVersion! });
    const thesis = await getPublicThesis(intent.thesisId);
    if (!thesis || thesis.mode !== 'live' || !thesis.publishedAt || thesis.instrumentId !== intent.instrumentId || requireThesisInstrument(thesis.instrumentId).mint !== intent.mint) throw new AgentApiError('NOT_FOUND', 'Live thesis changed', 404);
    if (intent.setupMessageHash) {
      const signature = typeof body.setupSignature === 'string' ? body.setupSignature : '';
      const unsigned = typeof body.unsignedTransaction === 'string' ? body.unsignedTransaction : '';
      const signed = typeof body.signedTransaction === 'string' ? body.signedTransaction : '';
      if (!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature) || !unsigned || !signed || unsigned.length > 10_000 || signed.length > 10_000 || createHash('sha256').update(unsigned).digest('hex') !== intent.setupMessageHash || bs58.encode(verifySignedSetup(unsigned, signed, intent.wallet).signature!) !== signature) throw new AgentApiError('INVALID_INPUT', 'Confirm the exact reviewed wallet setup before placing this order');
      const status = (await solanaConnection().getSignatureStatuses([signature], { searchTransactionHistory: true })).value[0];
      if (!status || status.err || !['confirmed', 'finalized'].includes(status.confirmationStatus || '')) throw new AgentApiError('INVALID_INPUT', 'Wallet setup has not confirmed');
    }
    const userSignature = typeof body.userSignature === 'string' ? body.userSignature : '';
    verifyOrderSignature(intent.orderMessage, userSignature, intent.wallet);
    const requestHash = createHash('sha256').update(JSON.stringify({ review: body.review, setupSignature: body.setupSignature ?? null, userSignature })).digest('hex');
    const reservation = await reserveAgentFlashOrder(agent, intent as AgentFlashIntent, idempotencyKey, requestHash);
    if (!reservation.created) return Response.json({ requestId: reservation.order.id, state: reservation.order.status, orderId: reservation.order.flashOrderId, idempotencyKey }, { status: reservation.order.status === 'submitted' ? 200 : 202, headers: { 'Cache-Control': 'private, no-store' } });
    let result: Record<string, unknown>;
    try {
      result = await flashPost('/order', { ...flashOrderFields(intent), quoteId: intent.quoteId, userSignature, svmNonce: intent.nonce, svmDeadline: intent.deadline, expireTime: intent.expireTime });
    } catch {
      await markAgentFlashOrder(agent, reservation.order.id, null);
      throw new AgentApiError('TEMPORARILY_UNAVAILABLE', 'Flash submission result is unknown. Inspect order history; do not retry with a new key.', 503);
    }
    if (typeof result.orderId !== 'string' || !result.orderId) {
      await markAgentFlashOrder(agent, reservation.order.id, null);
      throw new AgentApiError('TEMPORARILY_UNAVAILABLE', 'Flash did not return an order ID. Inspect order history before any retry.', 502);
    }
    await markAgentFlashOrder(agent, reservation.order.id, result.orderId);
    return Response.json({ requestId: reservation.order.id, state: 'submitted', orderId: result.orderId, thesisId: thesis.id, stockSymbol: requireThesisInstrument(thesis.instrumentId).symbol, spendUsdc: intent.qty, idempotencyKey }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return agentErrorResponse(error); }
}
