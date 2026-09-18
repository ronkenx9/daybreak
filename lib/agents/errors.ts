export type AgentErrorCode = 'INVALID_INPUT'|'KEY_REVOKED'|'SCOPE_REQUIRED'|'AGENT_PAUSED'|'INSTRUMENT_DISABLED'|'BUDGET_EXCEEDED'|'QUOTE_EXPIRED'|'PRICE_MOVED'|'INSUFFICIENT_BALANCE'|'IDEMPOTENCY_CONFLICT'|'RATE_LIMITED'|'NOT_FOUND'|'TEMPORARILY_UNAVAILABLE';

export class AgentApiError extends Error {
  constructor(public code: AgentErrorCode, message: string, public status = 400, public retryable = false) { super(message); }
}
export function agentErrorResponse(error: unknown, requestId = crypto.randomUUID()) {
  const known = error instanceof AgentApiError ? error : mapAgentError(error);
  return Response.json({ error: { code: known.code, message: known.message, retryable: known.retryable }, requestId }, {
    status: known.status,
    headers: { 'Cache-Control': 'no-store', ...(known.status === 429 ? { 'Retry-After': '60' } : {}) },
  });
}

function mapAgentError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'AGENT_PAUSED') return new AgentApiError('AGENT_PAUSED', 'This agent is paused', 403);
  if (message === 'AGENT_SCOPE_REQUIRED') return new AgentApiError('SCOPE_REQUIRED', 'This key does not have the required permission', 403);
  if (message === 'AGENT_INSTRUMENT_DISABLED') return new AgentApiError('INSTRUMENT_DISABLED', 'This stock token is outside the agent policy', 403);
  if (message === 'AGENT_BUDGET_EXCEEDED') return new AgentApiError('BUDGET_EXCEEDED', 'This action exceeds the agent policy budget', 409);
  if (message === 'AGENT_QUOTE_EXPIRED') return new AgentApiError('QUOTE_EXPIRED', 'The paper quote expired. Request a fresh quote.', 409);
  if (message === 'AGENT_IDEMPOTENCY_CONFLICT') return new AgentApiError('IDEMPOTENCY_CONFLICT', 'This idempotency key was already used for a different request', 409);
  if (message === 'PAPER_STOCK_BALANCE_LOW' || message === 'PAPER_POSITION_LOW') return new AgentApiError('INSUFFICIENT_BALANCE', 'The agent does not have enough paper balance for this trade', 409);
  if (message.startsWith('Price moved')) return new AgentApiError('PRICE_MOVED', message, 409);
  if (message === 'PAPER_ACTIVITY_LIMIT') return new AgentApiError('RATE_LIMITED', 'Too many paper trades. Try again in a minute.', 429, true);
  if (message === 'PAPER_MARKET_NOT_FOUND' || message === 'AGENT_NOT_FOUND') return new AgentApiError('NOT_FOUND', 'The requested resource was not found', 404);
  if (message === 'AGENT_KEY_REVOKED') return new AgentApiError('KEY_REVOKED', 'This agent key is invalid, expired or revoked', 401);
  return new AgentApiError('TEMPORARILY_UNAVAILABLE', 'The agent service is temporarily unavailable', 500, true);
}
