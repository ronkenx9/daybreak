import 'server-only';
import { and, count, desc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { getDb } from './client';
import { users, profiles, bookmarks, circles, circleMemberships, migrationImports, circleDiscoveries, discoverySaves, userBlocks, contentReports, newsComments, operations, tokenLaunches } from './schema';
import { CIRCLES, CIRCLE_SLUGS } from './circles';
import { DISCOVERY_CATALOG } from '@/lib/catalog';
import { TOKENS, tokenForTicker } from '@/lib/base/tokens';

const COMPANY_ID = /^[a-z0-9_.-]{1,64}$/i;
const SAVABLE_COMPANY_IDS = new Set([...TOKENS.map((t) => t.ticker), ...DISCOVERY_CATALOG.map((item) => item.id)]);
const MAX_BOOKMARKS = 100;
export const isValidCompanyId = (s: unknown): s is string => typeof s === 'string' && COMPANY_ID.test(s) && SAVABLE_COMPANY_IDS.has(s);

let circlesSeeded = false;
async function ensureCircles() {
  if (circlesSeeded) return;
  const db = getDb();
  await db.insert(circles).values(CIRCLES.map((c) => ({ slug: c.slug, name: c.name, description: c.description }))).onConflictDoNothing();
  circlesSeeded = true;
}

// Get-or-create the internal user for a verified Privy DID, plus a default
// profile. Idempotent under concurrent requests via unique-conflict no-ops.
export async function resolveUser(privyDid: string) {
  const db = getDb();
  await db.insert(users).values({ privyDid }).onConflictDoNothing({ target: users.privyDid });
  const [user] = await db.select().from(users).where(eq(users.privyDid, privyDid)).limit(1);
  if (!user) throw new Error('Unable to resolve the authenticated user');
  await db.insert(profiles).values({ userId: user.id }).onConflictDoNothing({ target: profiles.userId });
  return user;
}

export async function getAccount(userId: string) {
  const db = getDb();
  const [user] = await db.select({ onboardingCompletedAt: users.onboardingCompletedAt }).from(users).where(eq(users.id, userId)).limit(1);
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const bm = await db.select({ c: bookmarks.companyId }).from(bookmarks).where(eq(bookmarks.userId, userId));
  const mem = await db
    .select({ slug: circles.slug })
    .from(circleMemberships)
    .innerJoin(circles, eq(circleMemberships.circleId, circles.id))
    .where(and(eq(circleMemberships.userId, userId), eq(circleMemberships.status, 'active')));
  return {
    profile: profile
      ? { displayName: profile.displayName, avatar: profile.avatar, handle: profile.handle, bio: profile.bio, version: profile.version, onboardingCompleted: Boolean(user?.onboardingCompletedAt) }
      : null,
    bookmarks: bm.map((x) => x.c),
    memberships: mem.map((x) => x.slug),
  };
}

export async function updateProfile(
  userId: string,
  fields: { displayName?: string; avatar?: number; handle?: string | null; bio?: string | null },
  expectedVersion: number,
) {
  const db = getDb();
  const patch: Record<string, unknown> = { version: sql`${profiles.version} + 1`, updatedAt: new Date() };
  if (fields.displayName !== undefined) patch.displayName = fields.displayName.slice(0, 24);
  if (fields.avatar !== undefined) patch.avatar = Math.abs(Math.trunc(fields.avatar)) % 6;
  if (fields.handle !== undefined) patch.handle = fields.handle;
  if (fields.bio !== undefined) patch.bio = fields.bio?.slice(0, 280) ?? null;
  const res = await db.update(profiles).set(patch).where(and(eq(profiles.userId, userId), eq(profiles.version, expectedVersion))).returning();
  if (!res.length) return { conflict: true as const };
  const p = res[0];
  return { conflict: false as const, profile: { displayName: p.displayName, avatar: p.avatar, handle: p.handle, bio: p.bio, version: p.version } };
}

export async function addBookmark(userId: string, companyId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`daybreak-bookmarks:${userId}`}))`);
    const [existing] = await tx.select({ id: bookmarks.id }).from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.companyId, companyId))).limit(1);
    if (existing) return { ok: true as const };
    const [total] = await tx.select({ value: count() }).from(bookmarks).where(eq(bookmarks.userId, userId));
    if (Number(total?.value ?? 0) >= MAX_BOOKMARKS) return { ok: false as const, reason: 'limit' as const };
    await tx.insert(bookmarks).values({ userId, companyId }).onConflictDoNothing();
    return { ok: true as const };
  });
}
export async function removeBookmark(userId: string, companyId: string) {
  const db = getDb();
  await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.companyId, companyId)));
}

export async function joinCircle(userId: string, slug: string) {
  await ensureCircles();
  const db = getDb();
  const [circle] = await db.select().from(circles).where(eq(circles.slug, slug)).limit(1);
  if (!circle) return { ok: false as const };
  await db.insert(circleMemberships).values({ circleId: circle.id, userId }).onConflictDoNothing();
  return { ok: true as const };
}
export async function leaveCircle(userId: string, slug: string) {
  const db = getDb();
  const [circle] = await db.select().from(circles).where(eq(circles.slug, slug)).limit(1);
  if (!circle) return;
  await db.delete(circleMemberships).where(and(eq(circleMemberships.userId, userId), eq(circleMemberships.circleId, circle.id)));
}

// Explicit, idempotent import of a device's local profile. Runs once per
// (user, version); re-imports are no-ops.
export async function importLocal(
  userId: string,
  data: { bookmarks?: unknown[]; memberships?: unknown[]; displayName?: string; avatar?: number },
  version: string,
) {
  const db = getDb();
  const cleanBm = [...new Set((data.bookmarks ?? []).filter(isValidCompanyId))] as string[];
  if (cleanBm.length > MAX_BOOKMARKS) throw new Error('Import exceeds bookmark limit');

  await ensureCircles();
  const slugs = [...new Set((data.memberships ?? []).filter((s): s is string => typeof s === 'string' && (CIRCLE_SLUGS as readonly string[]).includes(s)))];
  return db.transaction(async (tx) => {
    // Claim first inside the transaction. A concurrent duplicate waits for this
    // transaction, then observes the unique conflict and performs no writes.
    const claimed = await tx.insert(migrationImports).values({ userId, version }).onConflictDoNothing().returning({ id: migrationImports.id });
    if (!claimed.length) return { alreadyImported: true as const, importedBookmarks: 0, importedMemberships: 0 };
    let importedBookmarks = 0;
    if (cleanBm.length) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`daybreak-bookmarks:${userId}`}))`);
      const current = await tx.select({ companyId: bookmarks.companyId }).from(bookmarks).where(eq(bookmarks.userId, userId));
      const existing = new Set(current.map((row) => row.companyId));
      const additions = cleanBm.filter((companyId) => !existing.has(companyId));
      if (current.length + additions.length > MAX_BOOKMARKS) throw new Error('Import exceeds bookmark limit');
      if (additions.length) await tx.insert(bookmarks).values(additions.map((companyId) => ({ userId, companyId }))).onConflictDoNothing();
      importedBookmarks = additions.length;
    }
    if (slugs.length) {
      const cs = await tx.select().from(circles).where(inArray(circles.slug, slugs));
      if (cs.length) await tx.insert(circleMemberships).values(cs.map((c) => ({ circleId: c.id, userId }))).onConflictDoNothing();
    }
    if (typeof data.displayName === 'string' || typeof data.avatar === 'number') {
      const patch: Record<string, unknown> = { updatedAt: new Date(), version: sql`${profiles.version} + 1` };
      if (typeof data.displayName === 'string') patch.displayName = data.displayName.slice(0, 24);
      if (typeof data.avatar === 'number') patch.avatar = Math.abs(Math.trunc(data.avatar)) % 6;
      await tx.update(profiles).set(patch).where(eq(profiles.userId, userId));
    }
    return { alreadyImported: false as const, importedBookmarks, importedMemberships: slugs.length };
  });
}

// ---- Social: shared discoveries in circles, saves, moderation ----

async function isCircleMember(userId: string, slug: string): Promise<boolean> {
  const db = getDb();
  const [c] = await db.select({ id: circles.id }).from(circles).where(eq(circles.slug, slug)).limit(1);
  if (!c) return false;
  const [m] = await db.select({ id: circleMemberships.id }).from(circleMemberships)
    .where(and(eq(circleMemberships.userId, userId), eq(circleMemberships.circleId, c.id), eq(circleMemberships.status, 'active'))).limit(1);
  return !!m;
}

const isSubjectType = (v: unknown): v is 'stock' | 'memestock' => v === 'stock' || v === 'memestock';

export async function createDiscovery(userId: string, input: { circleSlug: string; subjectType: string; subjectId: string; subjectLabel?: string; note?: string }) {
  await ensureCircles();
  if (!(CIRCLE_SLUGS as readonly string[]).includes(input.circleSlug)) return { ok: false as const, reason: 'circle' as const };
  if (!isSubjectType(input.subjectType)) return { ok: false as const, reason: 'subject' as const };
  if (typeof input.subjectId !== 'string' || !input.subjectId.trim()) return { ok: false as const, reason: 'subject' as const };
  if (!(await isCircleMember(userId, input.circleSlug))) return { ok: false as const, reason: 'member' as const };
  const db = getDb();
  const [row] = await db.insert(circleDiscoveries).values({
    userId, circleSlug: input.circleSlug, subjectType: input.subjectType,
    subjectId: input.subjectId.slice(0, 120), subjectLabel: input.subjectLabel?.slice(0, 80) ?? null,
    note: input.note?.slice(0, 280) ?? null,
  }).returning({ id: circleDiscoveries.id });
  return { ok: true as const, id: row.id };
}

export async function listCircleDiscoveries(userId: string, slug: string) {
  if (!(await isCircleMember(userId, slug))) return { ok: false as const, reason: 'member' as const };
  const db = getDb();
  const blocked = (await db.select({ b: userBlocks.blockedUserId }).from(userBlocks).where(eq(userBlocks.blockerUserId, userId))).map((r) => r.b);
  const rows = await db.select({
    id: circleDiscoveries.id, authorId: circleDiscoveries.userId, subjectType: circleDiscoveries.subjectType,
    subjectId: circleDiscoveries.subjectId, subjectLabel: circleDiscoveries.subjectLabel, note: circleDiscoveries.note,
    createdAt: circleDiscoveries.createdAt, authorName: profiles.displayName, authorAvatar: profiles.avatar,
  }).from(circleDiscoveries).leftJoin(profiles, eq(profiles.userId, circleDiscoveries.userId))
    .where(and(eq(circleDiscoveries.circleSlug, slug), eq(circleDiscoveries.status, 'active'), blocked.length ? notInArray(circleDiscoveries.userId, blocked) : sql`true`))
    .orderBy(desc(circleDiscoveries.createdAt)).limit(50);
  const saved = new Set((await db.select({ d: discoverySaves.discoveryId }).from(discoverySaves).where(eq(discoverySaves.userId, userId))).map((r) => r.d));
  // Internal author id is never returned; isMine is resolved server-side.
  return { ok: true as const, discoveries: rows.map(({ authorId, ...r }) => ({ ...r, isMine: authorId === userId, savedByMe: saved.has(r.id) })) };
}

export async function saveDiscovery(userId: string, discoveryId: string) {
  const db = getDb();
  const [d] = await db.select({ slug: circleDiscoveries.circleSlug }).from(circleDiscoveries)
    .where(and(eq(circleDiscoveries.id, discoveryId), eq(circleDiscoveries.status, 'active'))).limit(1);
  if (!d || !(await isCircleMember(userId, d.slug))) return { ok: false as const };
  await db.insert(discoverySaves).values({ userId, discoveryId }).onConflictDoNothing();
  return { ok: true as const };
}

export async function unsaveDiscovery(userId: string, discoveryId: string) {
  const db = getDb();
  await db.delete(discoverySaves).where(and(eq(discoverySaves.userId, userId), eq(discoverySaves.discoveryId, discoveryId)));
}

export async function removeDiscovery(userId: string, discoveryId: string) {
  const db = getDb();
  await db.update(circleDiscoveries).set({ status: 'removed' }).where(and(eq(circleDiscoveries.id, discoveryId), eq(circleDiscoveries.userId, userId)));
}

export async function blockByDiscovery(userId: string, discoveryId: string) {
  const db = getDb();
  const [d] = await db.select({ author: circleDiscoveries.userId }).from(circleDiscoveries).where(eq(circleDiscoveries.id, discoveryId)).limit(1);
  if (!d || d.author === userId) return { ok: false as const };
  await db.insert(userBlocks).values({ blockerUserId: userId, blockedUserId: d.author }).onConflictDoNothing();
  return { ok: true as const };
}

export async function reportDiscovery(userId: string, discoveryId: string, reason?: string) {
  const db = getDb();
  const [d] = await db.select({ id: circleDiscoveries.id }).from(circleDiscoveries).where(eq(circleDiscoveries.id, discoveryId)).limit(1);
  if (!d) return { ok: false as const };
  await db.insert(contentReports).values({ reporterUserId: userId, discoveryId, reason: reason?.slice(0, 200) ?? null }).onConflictDoNothing();
  return { ok: true as const };
}

export async function listNewsComments(articleKey: string) {
  const db = getDb();
  const rows = await db.select({
    id: newsComments.id, body: newsComments.body, createdAt: newsComments.createdAt,
    authorName: profiles.displayName, authorAvatar: profiles.avatar,
  }).from(newsComments).leftJoin(profiles, eq(profiles.userId, newsComments.userId))
    .where(and(eq(newsComments.articleKey, articleKey), eq(newsComments.status, 'active')))
    .orderBy(desc(newsComments.createdAt)).limit(100);
  return rows;
}

export async function createNewsComment(userId: string, input: { articleKey: string; articleUrl: string; ticker: string; body: string }) {
  const db = getDb();
  const [row] = await db.insert(newsComments).values({ userId, ...input }).returning({ id: newsComments.id });
  return row;
}

export async function removeNewsComment(userId: string, id: string) {
  const db = getDb();
  await db.update(newsComments).set({ status: 'removed' }).where(and(eq(newsComments.id, id), eq(newsComments.userId, userId)));
}

export async function recordLaunchSimulation(input: {
  userId: string; idempotencyKey: string; intentHash: string; ticker: string;
  feeRecipient: string; fingerprint: string; tokenAddress: string; poolId: string; allocation: string;
}) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [operation] = await tx.insert(operations).values({
      userId: input.userId, kind: 'launch', idempotencyKey: input.idempotencyKey,
      intentHash: input.intentHash, status: 'quoted', providerRef: input.tokenAddress,
    }).onConflictDoNothing().returning({ id: operations.id });
    if (!operation) throw new Error('DUPLICATE_LAUNCH_INTENT');
    const stock = tokenForTicker(input.ticker);
    const [launch] = await tx.insert(tokenLaunches).values({
      operationId: operation.id, creatorUserId: input.userId,
      quoteAsset: stock?.token.toLowerCase(), supply: '100000000000',
      allocation: input.allocation, feeRecipient: input.feeRecipient,
      simulationFingerprint: input.fingerprint, tokenAddress: input.tokenAddress,
      poolRef: input.poolId, status: 'simulated',
    }).returning({ id: tokenLaunches.id });
    return { operationId: operation.id, launchId: launch.id };
  });
}

export async function getLaunchIntent(userId: string, idempotencyKey: string) {
  const db = getDb();
  const [row] = await db.select({
    operationId: operations.id, intentHash: operations.intentHash,
    operationStatus: operations.status, launchId: tokenLaunches.id,
    fingerprint: tokenLaunches.simulationFingerprint,
  }).from(operations).innerJoin(tokenLaunches, eq(tokenLaunches.operationId, operations.id))
    .where(and(eq(operations.userId, userId), eq(operations.idempotencyKey, idempotencyKey), eq(operations.kind, 'launch'))).limit(1);
  return row ?? null;
}

export async function claimLaunchForDeployment(operationId: string, launchId: string) {
  const db = getDb(); const now = new Date();
  return db.transaction(async (tx) => {
    const claimed = await tx.update(operations).set({ status: 'submitted', updatedAt: now })
      .where(and(eq(operations.id, operationId), eq(operations.status, 'quoted'))).returning({ id: operations.id });
    if (!claimed.length) return false;
    await tx.update(tokenLaunches).set({ status: 'submitted', updatedAt: now }).where(eq(tokenLaunches.id, launchId));
    return true;
  });
}

export async function setLaunchStatus(input: { operationId: string; launchId: string; status: string; txHash?: string; tokenAddress?: string; poolId?: string; errorClass?: string }) {
  const db = getDb(); const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(operations).set({ status: input.status, txHash: input.txHash, errorClass: input.errorClass, updatedAt: now }).where(eq(operations.id, input.operationId));
    await tx.update(tokenLaunches).set({ status: input.status, tokenAddress: input.tokenAddress, poolRef: input.poolId, updatedAt: now }).where(eq(tokenLaunches.id, input.launchId));
  });
}
