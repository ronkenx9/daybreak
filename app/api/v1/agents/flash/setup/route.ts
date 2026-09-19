import { createHash } from 'node:crypto';
import bs58 from 'bs58';
import { requireFlashAgent, readAgentJson } from '@/lib/agents/auth';
import { AgentApiError, agentErrorResponse } from '@/lib/agents/errors';
import { assertAgentFlashPolicy, assertCurrentAgentFlashPolicy } from '@/lib/db/repo-agents';
import { getPublicThesis } from '@/lib/db/repo-theses';
import { openIntent, verifySignedSetup } from '@/lib/flash/stock-order';
import { requireThesisInstrument } from '@/lib/theses/instruments';
import { solanaConnection } from '@/lib/solana/client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const agent = await requireFlashAgent(request);
    const body = await readAgentJson(request, 25_000);
    const intent = openIntent(body.review);
    if (intent.userId !== `agent:${agent.actorId}` || intent.actorId !== agent.actorId || !intent.instrumentId || !Number.isInteger(intent.policyVersion)) throw new AgentApiError('INVALID_INPUT', 'This review belongs to another agent');
    assertAgentFlashPolicy(agent, { instrumentId: intent.instrumentId, wallet: intent.wallet, qty: intent.qty, policyVersion: intent.policyVersion! });
    const thesis = await getPublicThesis(intent.thesisId);
    if (!thesis || thesis.mode !== 'live' || !thesis.publishedAt || thesis.instrumentId !== intent.instrumentId || requireThesisInstrument(thesis.instrumentId).mint !== intent.mint) throw new AgentApiError('NOT_FOUND', 'Live thesis changed', 404);
    const unsigned = typeof body.unsignedTransaction === 'string' ? body.unsignedTransaction : '';
    const signed = typeof body.signedTransaction === 'string' ? body.signedTransaction : '';
    if (!intent.setupMessageHash || !unsigned || !signed || unsigned.length > 10_000 || signed.length > 10_000 || createHash('sha256').update(unsigned).digest('hex') !== intent.setupMessageHash) throw new AgentApiError('INVALID_INPUT', 'Setup differs from the reviewed instructions');
    const tx = verifySignedSetup(unsigned, signed, intent.wallet);
    const signature = bs58.encode(tx.signature!);
    await assertCurrentAgentFlashPolicy(agent, { instrumentId: intent.instrumentId, wallet: intent.wallet, qty: intent.qty, policyVersion: intent.policyVersion! });
    const connection = solanaConnection();
    const already = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
    if (!already.value[0] || already.value[0]?.err) {
      const sent = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
      if (sent !== signature) throw new AgentApiError('TEMPORARILY_UNAVAILABLE', 'Solana returned a different setup signature', 502);
    }
    const confirmed = await connection.confirmTransaction(signature, 'confirmed');
    if (confirmed.value.err) throw new AgentApiError('TEMPORARILY_UNAVAILABLE', 'Wallet setup was rejected on Solana', 502);
    return Response.json({ signature, status: 'confirmed' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return agentErrorResponse(error); }
}
