import 'server-only';
import { AgentApiError } from '@/lib/agents/errors';
import { normalizeAgentPaperThesis, normalizeAgentQuote, normalizeRationale } from '@/lib/agents/validation';
import { createAgentPaperQuote, executeAgentPaperQuote, publishAgentPaperThesis, requireAgentScope, type AgentPrincipal } from '@/lib/db/repo-agents';
import { getPublicThesis, listPublishedTheses } from '@/lib/db/repo-theses';
import { requireThesisInstrument } from '@/lib/theses/instruments';
import { thesisSlug } from '@/lib/theses/model';
import type { DeskDeps } from './run';

const IDEMPOTENCY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

// The desk's "agent API", called in-process for a system-owned desk agent. Each path runs the
// same validator → scope check → repository call as the public HTTP route; only key parsing
// is skipped, because the desk loads its principal directly.
export function inProcessAgentApi(principal: AgentPrincipal): DeskDeps['api'] {
  return async (path, init) => {
    try {
      const method = init.method ?? 'GET';
      if (method === 'POST' && init.idempotencyKey !== undefined && !IDEMPOTENCY.test(init.idempotencyKey)) throw new AgentApiError('INVALID_INPUT', 'Idempotency-Key must be 8..128 safe characters');
      if (path === '/api/v1/agents/me') return { status: 200, body: { agent: { publicId: principal.publicId, name: principal.name } } };
      if (path.startsWith('/api/v1/agents/theses') && method === 'GET') {
        return { status: 200, body: { items: await listPublishedTheses(40, { mode: 'paper', actorKind: 'agent', offset: 0 }) } };
      }
      if (path === '/api/v1/agents/paper/theses' && method === 'POST') {
        requireAgentScope(principal, 'paper:publish');
        const input = normalizeAgentPaperThesis(init.body as Record<string, unknown>);
        const instrument = requireThesisInstrument(input.instrumentId, 'create');
        const published = await publishAgentPaperThesis(principal, instrument.companyId, thesisSlug(input.title), input, init.idempotencyKey!);
        return { status: 201, body: { thesis: await getPublicThesis(String(published.thesisId)) as unknown as Record<string, unknown> } };
      }
      if (path === '/api/v1/agents/paper/quotes' && method === 'POST') {
        requireAgentScope(principal, 'paper:trade');
        return { status: 201, body: { quote: await createAgentPaperQuote(principal, normalizeAgentQuote(init.body as Record<string, unknown>)) } };
      }
      if (path === '/api/v1/agents/paper/trades' && method === 'POST') {
        requireAgentScope(principal, 'paper:trade');
        const body = init.body as { quoteId?: unknown; rationale?: unknown };
        const quoteId = typeof body.quoteId === 'string' ? body.quoteId : '';
        if (!/^[a-f0-9-]{36}$/i.test(quoteId)) throw new AgentApiError('INVALID_INPUT', 'quoteId must be a UUID');
        return { status: 201, body: { receipt: await executeAgentPaperQuote(principal, quoteId, init.idempotencyKey!, normalizeRationale(body.rationale)) } };
      }
      return { status: 404, body: { error: 'Unsupported desk call' } };
    } catch (error) {
      const status = error instanceof AgentApiError ? error.status : 500;
      return { status, body: { error: error instanceof Error ? error.message : 'Desk call failed' } };
    }
  };
}
