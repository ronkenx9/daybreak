import 'server-only';
import { authenticateAgentKey, requireAgentScope, type AgentPrincipal, type AgentScope } from '@/lib/db/repo-agents';
import { AgentApiError } from './errors';

export const isAgentPaperApiEnabled = process.env.AGENT_PAPER_API_ENABLED === '1';

export async function requireAgent(request: Request, scope: AgentScope = 'read'): Promise<AgentPrincipal> {
  if (!isAgentPaperApiEnabled) throw new AgentApiError('TEMPORARILY_UNAVAILABLE', 'Agent paper access is not enabled', 503, true);
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) throw new AgentApiError('KEY_REVOKED', 'Agent API key required', 401);
  const principal = await authenticateAgentKey(header.slice(7).trim());
  requireAgentScope(principal, scope);
  return principal;
}
export async function readAgentJson(request: Request, maxBytes = 16_384) {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new AgentApiError('INVALID_INPUT', 'Request body is too large', 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new AgentApiError('INVALID_INPUT', 'Request body is too large', 413);
  try {
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new AgentApiError('INVALID_INPUT', 'Invalid JSON body'); }
}
