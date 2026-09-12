import 'server-only';
import { and, count, desc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { getDb } from './client';
import { users, profiles, bookmarks, circles, circleMemberships, migrationImports, circleDiscoveries, discoverySaves, userBlocks, contentReports, newsComments, operations, tokenLaunches, linkedWallets, holdingEligibilities, communityTokens } from './schema';
import { CIRCLES, CIRCLE_SLUGS } from './circles';
import { DISCOVERY_CATALOG } from '@/lib/catalog';
import { TOKENS, tokenForTicker } from '@/lib/base/tokens';
import { circleGateEligible } from '@/lib/community/policy';

const COMPANY_ID = /^[a-z0-9_.-]{1,64}$/i;
const SAVABLE_COMPANY_IDS = new Set([...TOKENS.map((t) => t.ticker), ...DISCOVERY_CATALOG.map((item) => item.id)]);
const MAX_BOOKMARKS = 100;
export const isValidCompanyId = (s: unknown): s is string => typeof s === 'string' && COMPANY_ID.test(s) && SAVABLE_COMPANY_IDS.has(s);

let circlesSeeded = false;
async function ensureCircles() {
  if (circlesSeeded) return;
  const db = getDb();
  await db.insert(circles).values(CIRCLES.map((c) => ({ ...c, tickers: [...c.tickers], kind: 'interest', gateMode: 'open' }))).onConflictDoNothing();
  await db.insert(circles).values(TOKENS.map((t) => ({
    slug: `holders-${t.ticker.toLowerCase()}`, name: `${t.name} holders`,
    description: `A verified circle for people holding ${t.onchainSymbol} on Base.`,
    kind: 'stock', gateMode: 'any_stock', tickers: [t.ticker],
  }))).onConflictDoNothing();
  circlesSeeded = true;
}

export interface CircleView {
  slug: string; name: string; description: string | null; kind: string; gateMode: string;
  tickers: string[]; memberCount: number; joined: boolean; eligible: boolean; owned: boolean; tokenAddress: string | null;
}

export async function listCircles(userId: string): Promise<CircleView[]> {
  await ensureCircles();
  const db = getDb();
  const [all, memberships, eligibleRows, counts, tokens] = await Promise.all([
    db.select().from(circles).where(and(eq(circles.status, 'active'), eq(circles.visibility, 'public'))).orderBy(circles.createdAt),
    db.select({ circleId: circleMemberships.circleId }).from(circleMemberships).where(and(eq(circleMemberships.userId, userId), eq(circleMemberships.status, 'active'))),
    db.select({ ticker: holdingEligibilities.ticker }).from(holdingEligibilities).where(and(eq(holdingEligibilities.userId, userId), sql`${holdingEligibilities.expiresAt} > now()`)),
    db.select({ circleId: circleMemberships.circleId, value: count() }).from(circleMemberships).where(eq(circleMemberships.status, 'active')).groupBy(circleMemberships.circleId),
    db.select({ circleId: communityTokens.circleId, address: communityTokens.address }).from(communityTokens).where(eq(communityTokens.verificationStatus, 'verified')),
  ]);
  const joined = new Set(memberships.map((row) => row.circleId));
  const eligible = new Set(eligibleRows.map((row) => row.ticker));
  const memberCounts = new Map(counts.map((row) => [row.circleId, Number(row.value)]));
  return all.map((circle) => {
    const tickers = Array.isArray(circle.tickers) ? circle.tickers : [];
    const gateEligible = circleGateEligible(circle.gateMode, tickers, eligible);
    return { slug: circle.slug, name: circle.name, description: circle.description, kind: circle.kind, gateMode: circle.gateMode, tickers, memberCount: memberCounts.get(circle.id) ?? 0, joined: joined.has(circle.id) && gateEligible, eligible: gateEligible, owned: circle.creatorUserId === userId, tokenAddress: tokens.find((token) => token.circleId === circle.id)?.address ?? null };
  }).sort((a, b) => Number(b.joined) - Number(a.joined) || Number(b.eligible) - Number(a.eligible) || b.memberCount - a.memberCount);
}

const CIRCLE_NAME = /^[\p{L}\p{N}][\p{L}\p{N} .&'’-]{2,47}$/u;
export async function createCircle(userId: string, input: { name: string; description?: string; tickers: string[]; gateMode: string }) {
  await ensureCircles();
  if (!CIRCLE_NAME.test(input.name)) return { ok: false as const, reason: 'name' as const };
  const cleanTickers = [...new Set(input.tickers.map((t) => t.toUpperCase()).filter((t) => TOKENS.some((x) => x.ticker === t)))].slice(0, 5);
  const gateMode = input.gateMode === 'open' ? 'open' : input.gateMode === 'all_stocks' ? 'all_stocks' : 'any_stock';
  if (gateMode !== 'open' && !cleanTickers.length) return { ok: false as const, reason: 'tickers' as const };
  const db = getDb();
  const [recent] = await db.select({ value: count() }).from(circles).where(and(eq(circles.creatorUserId, userId), sql`${circles.createdAt} > now() - interval '24 hours'`));
  if (Number(recent?.value ?? 0) >= 3) return { ok: false as const, reason: 'limit' as const };
  const base = input.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'circle';
  const slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;
  const [circle] = await db.insert(circles).values({ slug, name: input.name.trim(), description: input.description?.trim().slice(0, 180) || null, creatorUserId: userId, kind: 'custom', gateMode, tickers: cleanTickers }).returning({ id: circles.id, slug: circles.slug });
  await db.insert(circleMemberships).values({ circleId: circle.id, userId, role: 'owner' });
  return { ok: true as const, slug: circle.slug };
}

export async function syncHoldingEligibility(userId: string, walletAddress: string, snapshot: import('@/lib/base/model').HoldingsSnapshot) {
  const db = getDb();
  const now = new Date(snapshot.observedAt);
  const expiresAt = new Date(snapshot.observedAt + 24 * 60 * 60_000);
  const failed = new Set(snapshot.failedTokens);
  const checkedTickers = TOKENS.filter((t) => !failed.has(t.onchainSymbol)).map((t) => t.ticker);
  const positives = snapshot.holdings.filter((h) => checkedTickers.includes(h.ticker));
  await db.transaction(async (tx) => {
    await tx.insert(linkedWallets).values({ userId, address: walletAddress, namespace: 'eip155:8453', verifiedAt: now }).onConflictDoUpdate({ target: [linkedWallets.namespace, linkedWallets.address], set: { userId, verifiedAt: now } });
    if (checkedTickers.length) await tx.delete(holdingEligibilities).where(and(eq(holdingEligibilities.userId, userId), inArray(holdingEligibilities.ticker, checkedTickers)));
    if (positives.length) await tx.insert(holdingEligibilities).values(positives.map((h) => ({ userId, ticker: h.ticker, walletAddress, tokenAddress: h.token.toLowerCase(), chainId: snapshot.chainId, blockNumber: snapshot.blockNumber, observedAt: now, expiresAt })));
  });
  return { tickers: positives.map((h) => h.ticker), expiresAt: expiresAt.toISOString(), status: snapshot.status };
}

export async function listCircleMembers(userId: string, slug: string) {
  const db = getDb();
  const [circle] = await db.select().from(circles).where(and(eq(circles.slug, slug), eq(circles.status, 'active'))).limit(1);
  if (!circle) return { ok: false as const, reason: 'missing' as const };
  if (!(await isCircleMember(userId, slug))) return { ok: false as const, reason: 'membership' as const };
  const rows = await db.select({ userId: circleMemberships.userId, role: circleMemberships.role, joinedAt: circleMemberships.joinedAt, displayName: profiles.displayName, handle: profiles.handle, avatar: profiles.avatar })
    .from(circleMemberships).innerJoin(profiles, eq(profiles.userId, circleMemberships.userId))
    .where(and(eq(circleMemberships.circleId, circle.id), eq(circleMemberships.status, 'active'))).orderBy(circleMemberships.joinedAt).limit(100);
  const ids = rows.map((row) => row.userId);
  const badges = ids.length ? await db.select({ userId: holdingEligibilities.userId, ticker: holdingEligibilities.ticker }).from(holdingEligibilities).where(and(inArray(holdingEligibilities.userId, ids), sql`${holdingEligibilities.expiresAt} > now()`)) : [];
  const required = Array.isArray(circle.tickers) ? circle.tickers : [];
  const members = rows.map((row) => ({ ...row, verifiedTickers: badges.filter((b) => b.userId === row.userId && (!required.length || required.includes(b.ticker))).map((b) => b.ticker) }))
    .filter((row) => circleGateEligible(circle.gateMode, required, row.verifiedTickers))
    .map(({ userId: _userId, ...row }) => row);
  return { ok: true as const, members };
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
  if (!circle) return { ok: false as const, reason: 'missing' as const };
  const tickers = Array.isArray(circle.tickers) ? circle.tickers : [];
  if (circle.gateMode !== 'open') {
    const rows = tickers.length ? await db.select({ ticker: holdingEligibilities.ticker }).from(holdingEligibilities).where(and(eq(holdingEligibilities.userId, userId), inArray(holdingEligibilities.ticker, tickers), sql`${holdingEligibilities.expiresAt} > now()`)) : [];
    const held = new Set(rows.map((row) => row.ticker));
    const eligible = circleGateEligible(circle.gateMode, tickers, held);
    if (!eligible) return { ok: false as const, reason: 'holding_required' as const };
  }
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
  const [c] = await db.select({ id: circles.id, gateMode: circles.gateMode, tickers: circles.tickers }).from(circles).where(eq(circles.slug, slug)).limit(1);
  if (!c) return false;
  const [m] = await db.select({ id: circleMemberships.id }).from(circleMemberships)
    .where(and(eq(circleMemberships.userId, userId), eq(circleMemberships.circleId, c.id), eq(circleMemberships.status, 'active'))).limit(1);
  if (!m) return false;
  const required = Array.isArray(c.tickers) ? c.tickers : [];
  if (c.gateMode === 'open') return true;
  const held = required.length ? await db.select({ ticker: holdingEligibilities.ticker }).from(holdingEligibilities).where(and(eq(holdingEligibilities.userId, userId), inArray(holdingEligibilities.ticker, required), sql`${holdingEligibilities.expiresAt} > now()`)) : [];
  return circleGateEligible(c.gateMode, required, held.map((row) => row.ticker));
}

const isSubjectType = (v: unknown): v is 'stock' | 'memestock' => v === 'stock' || v === 'memestock';

export async function createDiscovery(userId: string, input: { circleSlug: string; subjectType: string; subjectId: string; subjectLabel?: string; note?: string }) {
  await ensureCircles();
  if (!/^[a-z0-9-]{3,64}$/.test(input.circleSlug)) return { ok: false as const, reason: 'circle' as const };
  if (!isSubjectType(input.subjectType)) return { ok: false as const, reason: 'subject' as const };
  if (typeof input.subjectId !== 'string' || !input.subjectId.trim()) return { ok: false as const, reason: 'subject' as const };
  if (!(await isCircleMember(userId, input.circleSlug))) return { ok: false as const, reason: 'member' as const };
  const db = getDb();
  if (input.subjectType === 'stock') {
    const ticker = input.subjectId.toUpperCase();
    const [circle] = await db.select({ tickers: circles.tickers }).from(circles).where(eq(circles.slug, input.circleSlug)).limit(1);
    const allowed = Array.isArray(circle?.tickers) ? circle.tickers : [];
    if (!tokenForTicker(ticker) || (allowed.length > 0 && !allowed.includes(ticker))) return { ok: false as const, reason: 'subject' as const };
    input.subjectId = ticker;
  }
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

export async function setLaunchStatus(input: { operationId: string; launchId: string; status: string; txHash?: string; tokenAddress?: string; poolId?: string; errorClass?: string; ticker?: string }) {
  const db = getDb(); const now = new Date();
  if (input.status === 'confirmed' && input.ticker && input.tokenAddress) await ensureCircles();
  await db.transaction(async (tx) => {
    await tx.update(operations).set({ status: input.status, txHash: input.txHash, errorClass: input.errorClass, updatedAt: now }).where(eq(operations.id, input.operationId));
    let circleId: string | null = null;
    if (input.status === 'confirmed' && input.ticker && input.tokenAddress) {
      const [circle] = await tx.select({ id: circles.id }).from(circles).where(eq(circles.slug, `holders-${input.ticker.toLowerCase()}`)).limit(1);
      circleId = circle?.id ?? null;
      const stock = tokenForTicker(input.ticker);
      await tx.insert(communityTokens).values({ chain: 'base', address: input.tokenAddress.toLowerCase(), stockAddress: stock?.token.toLowerCase(), companyId: input.ticker, circleId, source: 'bankr', verificationStatus: 'verified', observedAt: now }).onConflictDoUpdate({ target: [communityTokens.chain, communityTokens.address], set: { stockAddress: stock?.token.toLowerCase(), companyId: input.ticker, circleId, source: 'bankr', verificationStatus: 'verified', observedAt: now } });
    }
    await tx.update(tokenLaunches).set({ status: input.status, tokenAddress: input.tokenAddress, poolRef: input.poolId, circleId, updatedAt: now }).where(eq(tokenLaunches.id, input.launchId));
  });
}
