import 'server-only';
import { createHash } from 'node:crypto';
import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { getDb } from './client';
import { agentApiKeys, agentAuditEvents, agentBudgetWindows, agentPolicies, agentQuotes, agentRequests, agents, marketActors, paperActivityLimits, paperPositions, paperStockBalances, paperThesisMarkets, paperTrades, profiles, theses, users } from './schema';
import { createAgentKey, parseAgentKey } from '@/lib/agents/keys';
import { AgentApiError } from '@/lib/agents/errors';
import { PAPER_STARTING_BASE_RESERVE, PAPER_STARTING_QUOTE_RESERVE, PAPER_STARTING_STOCK_BALANCE, paperExitMetrics, paperPositionMetrics, paperSpotPrice, quotePaperTrade, validatePaperTradePrecision, type PaperDirection, type PublicPaperThesisInput } from '@/lib/theses/paper';

export type AgentScope = 'read' | 'paper:publish' | 'paper:trade';
export interface AgentPrincipal {
  actorId: string; publicId: string; agentId: string; ownerUserId: string; name: string; strategy: string; avatar: number;
  status: string; policyVersion: number; keyId: string; keyPrefix: string; scopes: string[];
  policy: { allowedInstrumentIds: string[]; canPublish: boolean; maxInputPerTrade: number; dailyGrossBuy: number; maxSlippageBps: number; dailyPublicationLimit: number };
}

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function ensureHumanActor(userId: string) {
  const db = getDb();
  const [existing] = await db.select().from(marketActors).where(eq(marketActors.userId, userId)).limit(1);
  if (existing) return existing;
  const [user] = await db.select({ publicId: users.paperPublicId }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('PAPER_ACCOUNT_UNAVAILABLE');
  await db.insert(marketActors).values({ kind: 'human', userId, publicId: user.publicId }).onConflictDoNothing({ target: marketActors.userId });
  const [actor] = await db.select().from(marketActors).where(eq(marketActors.userId, userId)).limit(1);
  if (!actor) throw new Error('PAPER_ACCOUNT_UNAVAILABLE');
  return actor;
}

export async function createAgentForOwner(ownerUserId: string, input: { name: string; strategy: string; avatar: number; allowedInstrumentIds: string[]; scopes: string[]; maxInputPerTrade: number; dailyGrossBuy: number; maxSlippageBps: number; dailyPublicationLimit: number }) {
  const credential = createAgentKey();
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${ownerUserId}, 8))`);
    const [total] = await tx.select({ value: count() }).from(agents).where(and(eq(agents.ownerUserId, ownerUserId), inArray(agents.status, ['active','paused'])));
    if (Number(total?.value ?? 0) >= 3) throw new AgentApiError('BUDGET_EXCEEDED', 'Each account can operate up to three active or paused agents', 409);
    const [actor] = await tx.insert(marketActors).values({ kind: 'agent' }).returning();
    const [agent] = await tx.insert(agents).values({ actorId: actor.id, ownerUserId, name: input.name, strategy: input.strategy, avatar: input.avatar }).returning();
    const [policy] = await tx.insert(agentPolicies).values({ agentId: agent.id, allowedInstrumentIds: input.allowedInstrumentIds, maxInputPerTrade: input.maxInputPerTrade, dailyGrossBuy: input.dailyGrossBuy, maxSlippageBps: input.maxSlippageBps, dailyPublicationLimit: input.dailyPublicationLimit }).returning();
    const [key] = await tx.insert(agentApiKeys).values({ agentId: agent.id, prefix: credential.prefix, secretDigest: credential.digest, scopes: input.scopes }).returning({ id: agentApiKeys.id, prefix: agentApiKeys.prefix, scopes: agentApiKeys.scopes, createdAt: agentApiKeys.createdAt });
    return { agent: { ...agent, publicId: actor.publicId }, policy, key, apiKey: credential.value };
  });
}

export async function listOwnerAgents(ownerUserId: string) {
  const db = getDb();
  const rows = await db.select({ agent: agents, publicId: marketActors.publicId, policy: agentPolicies }).from(agents)
    .innerJoin(marketActors, eq(marketActors.id, agents.actorId)).innerJoin(agentPolicies, eq(agentPolicies.agentId, agents.id))
    .where(eq(agents.ownerUserId, ownerUserId)).orderBy(desc(agents.createdAt));
  const keys = rows.length ? await db.select({ id: agentApiKeys.id, agentId: agentApiKeys.agentId, prefix: agentApiKeys.prefix, scopes: agentApiKeys.scopes, expiresAt: agentApiKeys.expiresAt, revokedAt: agentApiKeys.revokedAt, lastUsedAt: agentApiKeys.lastUsedAt, createdAt: agentApiKeys.createdAt }).from(agentApiKeys).where(inArray(agentApiKeys.agentId, rows.map(row => row.agent.id))).orderBy(desc(agentApiKeys.createdAt)) : [];
  return rows.map(row => ({ ...row.agent, publicId: row.publicId, policy: row.policy, keys: keys.filter(key => key.agentId === row.agent.id) }));
}

export async function setOwnedAgentStatus(ownerUserId: string, agentId: string, status: 'active'|'paused'|'revoked') {
  const [row] = await getDb().update(agents).set({ status, updatedAt: new Date(), policyVersion: sql`${agents.policyVersion} + 1` }).where(and(eq(agents.id, agentId), eq(agents.ownerUserId, ownerUserId))).returning();
  if (!row) throw new AgentApiError('NOT_FOUND', 'Agent not found', 404);
  if (status === 'revoked') await getDb().update(agentApiKeys).set({ revokedAt: new Date() }).where(and(eq(agentApiKeys.agentId, agentId), isNull(agentApiKeys.revokedAt)));
  return row;
}

export async function rotateOwnedAgentKey(ownerUserId: string, agentId: string, scopes: string[]) {
  const credential = createAgentKey();
  return getDb().transaction(async (tx) => {
    const [agent] = await tx.select().from(agents).where(and(eq(agents.id, agentId), eq(agents.ownerUserId, ownerUserId))).limit(1);
    if (!agent || agent.status === 'revoked') throw new AgentApiError('NOT_FOUND', 'Agent not found', 404);
    await tx.update(agentApiKeys).set({ revokedAt: new Date() }).where(and(eq(agentApiKeys.agentId, agentId), isNull(agentApiKeys.revokedAt)));
    const [key] = await tx.insert(agentApiKeys).values({ agentId, prefix: credential.prefix, secretDigest: credential.digest, scopes }).returning({ id: agentApiKeys.id, prefix: agentApiKeys.prefix, scopes: agentApiKeys.scopes, createdAt: agentApiKeys.createdAt });
    return { key, apiKey: credential.value };
  });
}

export async function revokeOwnedAgentKey(ownerUserId: string, agentId: string, keyId: string) {
  const [row] = await getDb().update(agentApiKeys).set({ revokedAt: new Date() }).where(and(eq(agentApiKeys.id, keyId), eq(agentApiKeys.agentId, agentId), sql`exists (select 1 from agents a where a.id=${agentId}::uuid and a.owner_user_id=${ownerUserId}::uuid)`)).returning({ id: agentApiKeys.id });
  if (!row) throw new AgentApiError('NOT_FOUND', 'Agent key not found', 404);
  return row;
}

export async function authenticateAgentKey(rawKey: string): Promise<AgentPrincipal> {
  const parsed = parseAgentKey(rawKey);
  if (!parsed) throw new AgentApiError('KEY_REVOKED', 'This agent key is invalid, expired or revoked', 401);
  const db = getDb();
  const [row] = await db.select({ key: agentApiKeys, agent: agents, actor: marketActors, policy: agentPolicies }).from(agentApiKeys)
    .innerJoin(agents, eq(agents.id, agentApiKeys.agentId)).innerJoin(marketActors, eq(marketActors.id, agents.actorId)).innerJoin(agentPolicies, eq(agentPolicies.agentId, agents.id))
    .where(and(eq(agentApiKeys.prefix, parsed.prefix), eq(agentApiKeys.secretDigest, parsed.digest))).limit(1);
  if (!row || row.key.revokedAt || (row.key.expiresAt && row.key.expiresAt <= new Date()) || row.agent.status === 'revoked') throw new AgentApiError('KEY_REVOKED', 'This agent key is invalid, expired or revoked', 401);
  await db.update(agentApiKeys).set({ lastUsedAt: new Date() }).where(eq(agentApiKeys.id, row.key.id));
  return { actorId: row.actor.id, publicId: row.actor.publicId, agentId: row.agent.id, ownerUserId: row.agent.ownerUserId, name: row.agent.name, strategy: row.agent.strategy, avatar: row.agent.avatar, status: row.agent.status, policyVersion: row.agent.policyVersion, keyId: row.key.id, keyPrefix: row.key.prefix, scopes: row.key.scopes, policy: { allowedInstrumentIds: row.policy.allowedInstrumentIds, canPublish: row.policy.canPublish, maxInputPerTrade: row.policy.maxInputPerTrade, dailyGrossBuy: row.policy.dailyGrossBuy, maxSlippageBps: row.policy.maxSlippageBps, dailyPublicationLimit: row.policy.dailyPublicationLimit } };
}

export function requireAgentScope(principal: AgentPrincipal, scope: AgentScope) {
  if (principal.status !== 'active') throw new AgentApiError('AGENT_PAUSED', 'This agent is paused', 403);
  if (!principal.scopes.includes(scope)) throw new AgentApiError('SCOPE_REQUIRED', `The ${scope} scope is required`, 403);
}

async function claimRequest(tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0], actorId: string, operation: string, idempotencyKey: string, requestHash: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${actorId + ':' + operation + ':' + idempotencyKey}, 9))`);
  const [existing] = await tx.select().from(agentRequests).where(and(eq(agentRequests.actorId, actorId), eq(agentRequests.operation, operation), eq(agentRequests.idempotencyKey, idempotencyKey))).limit(1);
  if (existing) {
    if (existing.requestHash !== requestHash) throw new Error('AGENT_IDEMPOTENCY_CONFLICT');
    return { existing, created: null };
  }
  const [created] = await tx.insert(agentRequests).values({ actorId, operation, idempotencyKey, requestHash }).returning();
  return { existing: null, created };
}

export async function publishAgentPaperThesis(principal: AgentPrincipal, companyId: string, slug: string, input: PublicPaperThesisInput, idempotencyKey: string) {
  const requestHash = hash(input);
  return getDb().transaction(async (tx) => {
    const request = await claimRequest(tx, principal.actorId, 'paper:publish', idempotencyKey, requestHash);
    if (request.existing?.state === 'succeeded') return request.existing.response!;
    const [current] = await tx.select({ agent: agents, policy: agentPolicies }).from(agents).innerJoin(agentPolicies, eq(agentPolicies.agentId, agents.id)).where(eq(agents.id, principal.agentId)).limit(1);
    if (!current || current.agent.status !== 'active') throw new Error('AGENT_PAUSED');
    if (!current.policy.canPublish) throw new Error('AGENT_SCOPE_REQUIRED');
    if (!current.policy.allowedInstrumentIds.includes(input.instrumentId)) throw new Error('AGENT_INSTRUMENT_DISABLED');
    const [used] = await tx.select({ value: count() }).from(theses).where(and(eq(theses.authorActorId, principal.actorId), eq(theses.mode, 'paper'), sql`${theses.createdAt} >= date_trunc('day', now())`));
    if (Number(used?.value ?? 0) >= current.policy.dailyPublicationLimit) throw new Error('AGENT_BUDGET_EXCEEDED');
    const creationIntentId = crypto.randomUUID();
    const safeSlug = `${slug}-${requestHash.slice(0,8)}`.slice(0,96);
    const [thesis] = await tx.insert(theses).values({ slug: safeSlug, authorUserId: null, authorActorId: principal.actorId, instrumentId: input.instrumentId, companyId, title: input.title, summary: input.summary, body: input.body ?? input.summary, invalidation: input.invalidation ?? 'No invalidation supplied.', horizon: input.horizon ?? null, sources: input.sources ?? [], tokenName: input.tokenName, tokenSymbol: input.tokenSymbol, creationIntentId, creationIntentHash: requestHash, mode: 'paper', status: 'published', visibility: 'public', publishedAt: new Date() }).returning();
    await tx.insert(paperThesisMarkets).values({ thesisId: thesis.id, baseReserve: PAPER_STARTING_BASE_RESERVE, quoteReserve: PAPER_STARTING_QUOTE_RESERVE });
    const response = { thesisId: thesis.id, slug: thesis.slug, state: 'published', mode: 'paper' };
    await tx.update(agentRequests).set({ state: 'succeeded', resourceId: thesis.id, response, updatedAt: new Date() }).where(eq(agentRequests.id, request.created!.id));
    return response;
  });
}

export async function createAgentPaperQuote(principal: AgentPrincipal, input: { thesisId: string; direction: PaperDirection; amount: number; slippageBps: number }) {
  return getDb().transaction(async (tx) => {
    const [current] = await tx.select({ agent: agents, policy: agentPolicies }).from(agents).innerJoin(agentPolicies, eq(agentPolicies.agentId, agents.id)).where(eq(agents.id, principal.agentId)).limit(1);
    if (!current || current.agent.status !== 'active') throw new Error('AGENT_PAUSED');
    if (input.amount > current.policy.maxInputPerTrade) throw new Error('AGENT_BUDGET_EXCEEDED');
    if (input.slippageBps > current.policy.maxSlippageBps) throw new Error('AGENT_BUDGET_EXCEEDED');
    const [market] = await tx.select({ instrumentId: theses.instrumentId, baseReserve: paperThesisMarkets.baseReserve, quoteReserve: paperThesisMarkets.quoteReserve }).from(theses).innerJoin(paperThesisMarkets, eq(paperThesisMarkets.thesisId, theses.id)).where(and(eq(theses.id, input.thesisId), eq(theses.mode, 'paper'), eq(theses.status, 'published'))).limit(1);
    if (!market) throw new Error('PAPER_MARKET_NOT_FOUND');
    if (!current.policy.allowedInstrumentIds.includes(market.instrumentId)) throw new Error('AGENT_INSTRUMENT_DISABLED');
    const quote = quotePaperTrade(market, input.direction, input.amount); validatePaperTradePrecision(quote);
    const [balance] = await tx.select().from(paperStockBalances).where(and(eq(paperStockBalances.actorId, principal.actorId), eq(paperStockBalances.instrumentId, market.instrumentId))).limit(1);
    const [position] = await tx.select().from(paperPositions).where(and(eq(paperPositions.actorId, principal.actorId), eq(paperPositions.thesisId, input.thesisId))).limit(1);
    if (input.direction === 'buy' && input.amount > (balance?.balance ?? PAPER_STARTING_STOCK_BALANCE)) throw new Error('PAPER_STOCK_BALANCE_LOW');
    if (input.direction === 'sell' && input.amount > (position?.quantity ?? 0)) throw new Error('PAPER_POSITION_LOW');
    const expiresAt = new Date(Date.now() + 60_000);
    const [stored] = await tx.insert(agentQuotes).values({ actorId: principal.actorId, thesisId: input.thesisId, instrumentId: market.instrumentId, direction: input.direction, inputAmount: input.amount, expectedOutput: quote.outputAmount, minimumOutput: quote.outputAmount * (1 - input.slippageBps / 10_000), feeAmount: quote.feeAmount, priceImpactPct: quote.priceImpactPct, slippageBps: input.slippageBps, policyVersion: current.agent.policyVersion, expiresAt }).returning();
    return { quoteId: stored.id, mode: 'paper' as const, thesisId: stored.thesisId, instrumentId: stored.instrumentId, direction: stored.direction, inputAmount: stored.inputAmount.toFixed(10), expectedOutput: stored.expectedOutput.toFixed(10), minimumOutput: stored.minimumOutput.toFixed(10), feeAmount: stored.feeAmount.toFixed(10), priceImpactPct: stored.priceImpactPct, expiresAt: stored.expiresAt.toISOString(), policyVersion: stored.policyVersion };
  });
}

export async function executeAgentPaperQuote(principal: AgentPrincipal, quoteId: string, idempotencyKey: string, rationale: string | null) {
  const requestHash = hash({ quoteId, rationale });
  return getDb().transaction(async (tx) => {
    const request = await claimRequest(tx, principal.actorId, 'paper:trade', idempotencyKey, requestHash);
    if (request.existing?.state === 'succeeded') return request.existing.response!;
    await tx.execute(sql`select id from agent_quotes where id=${quoteId}::uuid and actor_id=${principal.actorId}::uuid for update`);
    const [stored] = await tx.select().from(agentQuotes).where(and(eq(agentQuotes.id, quoteId), eq(agentQuotes.actorId, principal.actorId))).limit(1);
    if (!stored) throw new AgentApiError('NOT_FOUND', 'Paper quote not found', 404);
    if (stored.status === 'executed') throw new Error('AGENT_IDEMPOTENCY_CONFLICT');
    if (stored.expiresAt <= new Date()) throw new Error('AGENT_QUOTE_EXPIRED');
    const [current] = await tx.select({ agent: agents, policy: agentPolicies }).from(agents).innerJoin(agentPolicies, eq(agentPolicies.agentId, agents.id)).where(eq(agents.id, principal.agentId)).limit(1);
    if (!current || current.agent.status !== 'active') throw new Error('AGENT_PAUSED');
    if (!current.policy.allowedInstrumentIds.includes(stored.instrumentId) || stored.inputAmount > current.policy.maxInputPerTrade || stored.slippageBps > current.policy.maxSlippageBps) throw new Error('AGENT_BUDGET_EXCEEDED');
    await tx.execute(sql`select thesis_id from paper_thesis_markets where thesis_id=${stored.thesisId}::uuid for update`);
    const [market] = await tx.select({ baseReserve: paperThesisMarkets.baseReserve, quoteReserve: paperThesisMarkets.quoteReserve }).from(paperThesisMarkets).where(eq(paperThesisMarkets.thesisId, stored.thesisId)).limit(1);
    if (!market) throw new Error('PAPER_MARKET_NOT_FOUND');
    const quote = quotePaperTrade(market, stored.direction as PaperDirection, stored.inputAmount); validatePaperTradePrecision(quote);
    if (quote.outputAmount < stored.minimumOutput) throw new Error('Price moved beyond your minimum received. Request a fresh quote.');
    if (stored.direction === 'buy') {
      await tx.insert(agentBudgetWindows).values({ actorId: principal.actorId, instrumentId: stored.instrumentId, windowStart: sql`current_date`, grossBuy: 0, tradeCount: 0 }).onConflictDoNothing();
      await tx.execute(sql`select actor_id from agent_budget_windows where actor_id=${principal.actorId}::uuid and instrument_id=${stored.instrumentId} and window_start=current_date for update`);
      const [budget] = await tx.select().from(agentBudgetWindows).where(and(eq(agentBudgetWindows.actorId, principal.actorId), eq(agentBudgetWindows.instrumentId, stored.instrumentId), sql`${agentBudgetWindows.windowStart}=current_date`)).limit(1);
      if (!budget || budget.grossBuy + stored.inputAmount > current.policy.dailyGrossBuy) throw new Error('AGENT_BUDGET_EXCEEDED');
      await tx.update(agentBudgetWindows).set({ grossBuy: budget.grossBuy + stored.inputAmount, tradeCount: budget.tradeCount + 1 }).where(and(eq(agentBudgetWindows.actorId, principal.actorId), eq(agentBudgetWindows.instrumentId, stored.instrumentId), sql`${agentBudgetWindows.windowStart}=current_date`));
    }
    const [capacity] = await tx.insert(paperActivityLimits).values({ userId: null, actorId: principal.actorId, windowStart: sql`date_trunc('minute', now())`, count: 1 }).onConflictDoUpdate({ target: [paperActivityLimits.actorId, paperActivityLimits.windowStart], set: { count: sql`${paperActivityLimits.count}+1` } }).returning({ count: paperActivityLimits.count });
    if (!capacity || capacity.count > 20) throw new Error('PAPER_ACTIVITY_LIMIT');
    await tx.insert(paperStockBalances).values({ userId: null, actorId: principal.actorId, publicId: principal.publicId, instrumentId: stored.instrumentId, balance: PAPER_STARTING_STOCK_BALANCE }).onConflictDoNothing();
    await tx.insert(paperPositions).values({ thesisId: stored.thesisId, userId: null, actorId: principal.actorId, publicId: principal.publicId }).onConflictDoNothing();
    await tx.execute(sql`select actor_id from paper_stock_balances where actor_id=${principal.actorId}::uuid and instrument_id=${stored.instrumentId} for update`);
    const [balance] = await tx.select().from(paperStockBalances).where(and(eq(paperStockBalances.actorId, principal.actorId), eq(paperStockBalances.instrumentId, stored.instrumentId))).limit(1);
    const [position] = await tx.select().from(paperPositions).where(and(eq(paperPositions.actorId, principal.actorId), eq(paperPositions.thesisId, stored.thesisId))).limit(1);
    if (!balance || !position) throw new Error('PAPER_ACCOUNT_UNAVAILABLE');
    if (stored.direction === 'buy' && stored.inputAmount > balance.balance) throw new Error('PAPER_STOCK_BALANCE_LOW');
    if (stored.direction === 'sell' && stored.inputAmount > position.quantity) throw new Error('PAPER_POSITION_LOW');
    const nextMarket = stored.direction === 'buy' ? { baseReserve: market.baseReserve - quote.outputAmount, quoteReserve: market.quoteReserve + stored.inputAmount } : { baseReserve: market.baseReserve + stored.inputAmount, quoteReserve: market.quoteReserve - quote.outputAmount };
    let quantity = position.quantity, costBasisQuote = position.costBasisQuote, realizedPnlQuote = position.realizedPnlQuote;
    const nextStockBalance = stored.direction === 'buy' ? balance.balance - stored.inputAmount : balance.balance + quote.outputAmount;
    if (stored.direction === 'buy') { quantity += quote.outputAmount; costBasisQuote += stored.inputAmount; }
    else { const allocated = quantity > 0 ? costBasisQuote * (stored.inputAmount / quantity) : 0; quantity -= stored.inputAmount; costBasisQuote = Math.max(0, costBasisQuote - allocated); realizedPnlQuote += quote.outputAmount - allocated; if (quantity < 1e-9) { quantity = 0; costBasisQuote = 0; } }
    const now = new Date();
    await tx.update(paperThesisMarkets).set({ ...nextMarket, tradeCount: sql`${paperThesisMarkets.tradeCount}+1`, updatedAt: now }).where(eq(paperThesisMarkets.thesisId, stored.thesisId));
    await tx.update(paperStockBalances).set({ balance: nextStockBalance, updatedAt: now }).where(and(eq(paperStockBalances.actorId, principal.actorId), eq(paperStockBalances.instrumentId, stored.instrumentId)));
    await tx.update(paperPositions).set({ quantity, costBasisQuote, realizedPnlQuote, updatedAt: now }).where(and(eq(paperPositions.actorId, principal.actorId), eq(paperPositions.thesisId, stored.thesisId)));
    const [trade] = await tx.insert(paperTrades).values({ thesisId: stored.thesisId, userId: null, actorId: principal.actorId, intentId: stored.id, intentHash: requestHash, direction: stored.direction, inputAmount: stored.inputAmount, outputAmount: quote.outputAmount, feeAmount: quote.feeAmount, priceImpactPct: quote.priceImpactPct, rationale, executedAt: now }).returning();
    await tx.update(agentQuotes).set({ status: 'executed' }).where(eq(agentQuotes.id, stored.id));
    const response = { receiptId: trade.id, quoteId: stored.id, thesisId: stored.thesisId, direction: trade.direction, inputAmount: trade.inputAmount.toFixed(10), outputAmount: trade.outputAmount.toFixed(10), executedAt: trade.executedAt.toISOString(), rationale };
    await tx.update(agentRequests).set({ state: 'succeeded', resourceId: trade.id, response, updatedAt: now }).where(eq(agentRequests.id, request.created!.id));
    await tx.insert(agentAuditEvents).values({ actorId: principal.actorId, keyPrefix: principal.keyPrefix, operation: 'paper:trade', resultCode: 'succeeded', requestId: request.created!.id });
    return response;
  });
}

export async function getAgentRequest(principal: AgentPrincipal, idempotencyKey: string) {
  const [row] = await getDb().select({ operation: agentRequests.operation, idempotencyKey: agentRequests.idempotencyKey, state: agentRequests.state, resourceId: agentRequests.resourceId, response: agentRequests.response, createdAt: agentRequests.createdAt, updatedAt: agentRequests.updatedAt }).from(agentRequests).where(and(eq(agentRequests.actorId, principal.actorId), eq(agentRequests.idempotencyKey, idempotencyKey))).orderBy(desc(agentRequests.createdAt)).limit(1);
  if (!row) throw new AgentApiError('NOT_FOUND', 'Request not found', 404);
  return row;
}

export async function getAgentLimits(principal: AgentPrincipal) {
  const rows = await getDb().select().from(agentBudgetWindows).where(and(eq(agentBudgetWindows.actorId, principal.actorId), sql`${agentBudgetWindows.windowStart}=current_date`));
  return { policy: principal.policy, usage: rows, resetsAt: new Date(new Date().setUTCHours(24,0,0,0)).toISOString() };
}

export async function getPublicAgentProfile(publicId: string) {
  const db = getDb();
  const [row] = await db.select({ publicId: marketActors.publicId, actorId: marketActors.id, createdAt: marketActors.createdAt, name: agents.name, strategy: agents.strategy, avatar: agents.avatar, status: agents.status }).from(marketActors).innerJoin(agents, eq(agents.actorId, marketActors.id)).where(and(eq(marketActors.publicId, publicId), inArray(agents.status, ['active','paused']))).limit(1);
  if (!row) return null;
  const [published] = await db.select({ value: count() }).from(theses).where(and(eq(theses.authorActorId, row.actorId), eq(theses.mode, 'paper'), eq(theses.status, 'published')));
  const [trades] = await db.select({ value: count() }).from(paperTrades).where(eq(paperTrades.actorId, row.actorId));
  return { publicId: row.publicId, name: row.name, strategy: row.strategy, avatar: row.avatar, status: row.status, createdAt: row.createdAt, paperTheses: Number(published?.value ?? 0), paperTrades: Number(trades?.value ?? 0) };
}
