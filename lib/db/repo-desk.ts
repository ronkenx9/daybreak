import 'server-only';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { getDb } from './client';
import { agentApiKeys, agentPolicies, agents, marketActors, paperTrades, profiles, theses } from './schema';
import { resolveUser } from './repo';
import { createAgentKey } from '@/lib/agents/keys';
import type { AgentPrincipal } from './repo-agents';
import { THESIS_INSTRUMENTS } from '@/lib/theses/instruments';
import type { DeskPersona } from '@/lib/agents/desk/personas';

// The morning desk is Daybreak's own newsroom, not a user: its agents belong to a system owner
// that has no login (its Privy DID can never be issued). Users keep the three-agent cap; the
// desk's agents are ordinary agents with ordinary policies, tighter than user defaults.
const DESK_OWNER_DID = 'system:daybreak-morning-desk';
const DESK_SCOPES = ['read', 'paper:publish', 'paper:trade'];
const DESK_POLICY = { maxInputPerTrade: 2, dailyGrossBuy: 10, maxSlippageBps: 300, dailyPublicationLimit: 1 };

export async function ensureDeskOwner(): Promise<string> {
  const owner = await resolveUser(DESK_OWNER_DID);
  await getDb().update(profiles).set({ displayName: 'Daybreak Morning Desk' }).where(eq(profiles.userId, owner.id));
  return owner.id;
}

/** Idempotently create the persona's agent under the desk owner; returns its agent id. */
export async function ensureDeskAgent(persona: DeskPersona): Promise<string> {
  const ownerUserId = await ensureDeskOwner();
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${ownerUserId + ':' + persona.id}, 8))`);
    const [existing] = await tx.select({ id: agents.id }).from(agents)
      .where(and(eq(agents.ownerUserId, ownerUserId), eq(agents.name, persona.name), inArray(agents.status, ['active', 'paused']))).limit(1);
    if (existing) return existing.id;
    const [actor] = await tx.insert(marketActors).values({ kind: 'agent' }).returning();
    const [agent] = await tx.insert(agents).values({ actorId: actor.id, ownerUserId, name: persona.name, strategy: `Morning desk · ${persona.style}`.slice(0, 280), avatar: persona.avatar }).returning();
    // Backing other agents' ideas needs every thesis instrument, so the allowlist covers all of them.
    await tx.insert(agentPolicies).values({ agentId: agent.id, allowedInstrumentIds: THESIS_INSTRUMENTS.map((i) => i.id), ...DESK_POLICY });
    const credential = createAgentKey(); // stored hashed like any agent key; the secret is never used
    await tx.insert(agentApiKeys).values({ agentId: agent.id, prefix: credential.prefix, secretDigest: credential.digest, scopes: DESK_SCOPES });
    return agent.id;
  });
}

/** The same principal key authentication produces, loaded by agent id for the desk's in-process calls. */
export async function deskPrincipal(agentId: string): Promise<AgentPrincipal> {
  const [row] = await getDb().select({ key: agentApiKeys, agent: agents, actor: marketActors, policy: agentPolicies }).from(agentApiKeys)
    .innerJoin(agents, eq(agents.id, agentApiKeys.agentId)).innerJoin(marketActors, eq(marketActors.id, agents.actorId)).innerJoin(agentPolicies, eq(agentPolicies.agentId, agents.id))
    .where(and(eq(agentApiKeys.agentId, agentId), isNull(agentApiKeys.revokedAt))).limit(1);
  if (!row || row.agent.status === 'revoked') throw new Error('Desk agent is revoked or has no active key');
  return {
    actorId: row.actor.id, publicId: row.actor.publicId, agentId: row.agent.id, ownerUserId: row.agent.ownerUserId, name: row.agent.name, strategy: row.agent.strategy, avatar: row.agent.avatar,
    status: row.agent.status, policyVersion: row.agent.policyVersion, keyId: row.key.id, keyPrefix: row.key.prefix, scopes: row.key.scopes,
    policy: { allowedInstrumentIds: row.policy.allowedInstrumentIds, canPublish: row.policy.canPublish, maxInputPerTrade: row.policy.maxInputPerTrade, dailyGrossBuy: row.policy.dailyGrossBuy, maxSlippageBps: row.policy.maxSlippageBps, dailyPublicationLimit: row.policy.dailyPublicationLimit, liveFlashEnabled: row.policy.liveFlashEnabled, liveFlashWallet: row.policy.liveFlashWallet, liveFlashMaxUsdcPerOrder: row.policy.liveFlashMaxUsdcPerOrder, liveFlashDailyUsdc: row.policy.liveFlashDailyUsdc },
  };
}

/** The thesis this desk agent already published today (UTC), if any. Checked before any model call. */
export async function deskPublishedToday(actorId: string, day: string): Promise<{ id: string; slug: string; title: string } | null> {
  const [row] = await getDb().select({ id: theses.id, slug: theses.slug, title: theses.title }).from(theses)
    .where(and(eq(theses.authorActorId, actorId), sql`${theses.publishedAt} >= ${day}::date`, sql`${theses.publishedAt} < (${day}::date + interval '1 day')`)).limit(1);
  return row ?? null;
}

/** Whether this desk agent has made any paper trade today (UTC). Backing runs at most until it has. */
export async function deskTradedToday(actorId: string, day: string): Promise<boolean> {
  const [row] = await getDb().select({ id: paperTrades.id }).from(paperTrades)
    .where(and(eq(paperTrades.actorId, actorId), sql`${paperTrades.executedAt} >= ${day}::date`, sql`${paperTrades.executedAt} < (${day}::date + interval '1 day')`)).limit(1);
  return !!row;
}
