import { createHash } from 'node:crypto';
import { requireFlashAgent, readAgentJson } from '@/lib/agents/auth';
import { AgentApiError, agentErrorResponse } from '@/lib/agents/errors';
import { assertAgentFlashPolicy } from '@/lib/db/repo-agents';
import { getPublicThesis } from '@/lib/db/repo-theses';
import { buildSetupTransaction, decimalAmount, flashOrderFields, flashPost, sealIntent, type FlashIntent } from '@/lib/flash/stock-order';
import { requireThesisInstrument } from '@/lib/theses/instruments';
import { USDC_SOLANA_MINT } from '@/lib/solana/xstocks-registry';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const agent = await requireFlashAgent(request);
    const body = await readAgentJson(request, 2_048);
    if (typeof body.thesisId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.thesisId)) throw new AgentApiError('INVALID_INPUT', 'thesisId must be a UUID');
    const thesis = await getPublicThesis(body.thesisId);
    if (!thesis || thesis.mode !== 'live' || !thesis.publishedAt) throw new AgentApiError('NOT_FOUND', 'Live thesis not found', 404);
    const instrument = requireThesisInstrument(thesis.instrumentId);
    const wallet = agent.policy.liveFlashWallet!;
    const qty = decimalAmount(body.amount, 6, 100);
    const limitCrossPrice = decimalAmount(body.limitPrice, 6, 1_000_000);
    assertAgentFlashPolicy(agent, { instrumentId: instrument.id, wallet, qty, policyVersion: agent.policyVersion });
    const expireTime = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
    const quote = await flashPost('/quote', { ...flashOrderFields({ wallet, mint: instrument.mint, qty, limitCrossPrice }), forceMinimalAllowance: true, expireTime });
    if (quote.targetAsset !== instrument.mint || quote.contraAsset !== USDC_SOLANA_MINT || quote.side !== 'buy' || quote.orderType !== 'limit') throw new AgentApiError('TEMPORARILY_UNAVAILABLE', 'Flash returned a different stock pair', 502);
    const svm = quote.svm as Record<string, unknown> | null;
    if (!svm || typeof quote.quoteId !== 'string' || typeof svm.orderMessage !== 'string' || typeof svm.nonce !== 'string' || !['string','number'].includes(typeof svm.deadline) || quote.wrap) throw new AgentApiError('TEMPORARILY_UNAVAILABLE', 'Flash returned an incomplete Solana order', 502);
    const setupTransactionBase64 = await buildSetupTransaction(svm, wallet, instrument.mint, qty);
    const intent: FlashIntent = { version: 1, userId: `agent:${agent.actorId}`, actorId: agent.actorId, policyVersion: agent.policyVersion, instrumentId: instrument.id, thesisId: thesis.id, wallet, mint: instrument.mint, qty, limitCrossPrice, quoteId: quote.quoteId, orderMessage: svm.orderMessage, nonce: svm.nonce, deadline: String(svm.deadline), expireTime, setupMessageHash: setupTransactionBase64 ? createHash('sha256').update(setupTransactionBase64).digest('hex') : null, issuedAt: Date.now() };
    const to = quote.to as { amount?: unknown } | undefined;
    const fees = quote.fees as { estimatedFeeNotional?: unknown } | undefined;
    return Response.json({ review: sealIntent(intent), setupTransactionBase64, wallet, thesisId: thesis.id, instrumentId: instrument.id, stockSymbol: instrument.symbol, stockMint: instrument.mint, spendUsdc: qty, limitPrice: limitCrossPrice, estimatedReceive: typeof to?.amount === 'string' ? to.amount : null, estimatedFeeUsd: typeof fees?.estimatedFeeNotional === 'string' ? fees.estimatedFeeNotional : null, orderMessage: svm.orderMessage, deadline: intent.deadline }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return agentErrorResponse(error); }
}
