import 'server-only';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from './client';
import { users, profiles, bookmarks, circles, circleMemberships, migrationImports } from './schema';
import { CIRCLES, CIRCLE_SLUGS } from './circles';

const COMPANY_ID = /^[a-z0-9_.-]{1,64}$/i;
export const isValidCompanyId = (s: unknown): s is string => typeof s === 'string' && COMPANY_ID.test(s);

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
  await db.insert(profiles).values({ userId: user.id }).onConflictDoNothing({ target: profiles.userId });
  return user;
}

export async function getAccount(userId: string) {
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const bm = await db.select({ c: bookmarks.companyId }).from(bookmarks).where(eq(bookmarks.userId, userId));
  const mem = await db
    .select({ slug: circles.slug })
    .from(circleMemberships)
    .innerJoin(circles, eq(circleMemberships.circleId, circles.id))
    .where(eq(circleMemberships.userId, userId));
  return {
    profile: profile
      ? { displayName: profile.displayName, avatar: profile.avatar, handle: profile.handle, bio: profile.bio, version: profile.version, onboardingCompleted: false }
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
  await db.insert(bookmarks).values({ userId, companyId }).onConflictDoNothing();
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
  const [already] = await db.select().from(migrationImports).where(and(eq(migrationImports.userId, userId), eq(migrationImports.version, version))).limit(1);
  if (already) return { alreadyImported: true as const, importedBookmarks: 0, importedMemberships: 0 };

  const cleanBm = [...new Set((data.bookmarks ?? []).filter(isValidCompanyId))] as string[];
  if (cleanBm.length) await db.insert(bookmarks).values(cleanBm.map((companyId) => ({ userId, companyId }))).onConflictDoNothing();

  await ensureCircles();
  const slugs = [...new Set((data.memberships ?? []).filter((s): s is string => typeof s === 'string' && (CIRCLE_SLUGS as readonly string[]).includes(s)))];
  if (slugs.length) {
    const cs = await db.select().from(circles).where(inArray(circles.slug, slugs));
    if (cs.length) await db.insert(circleMemberships).values(cs.map((c) => ({ circleId: c.id, userId }))).onConflictDoNothing();
  }

  if (typeof data.displayName === 'string' || typeof data.avatar === 'number') {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof data.displayName === 'string') patch.displayName = data.displayName.slice(0, 24);
    if (typeof data.avatar === 'number') patch.avatar = Math.abs(Math.trunc(data.avatar)) % 6;
    await db.update(profiles).set(patch).where(eq(profiles.userId, userId));
  }

  await db.insert(migrationImports).values({ userId, version }).onConflictDoNothing();
  return { alreadyImported: false as const, importedBookmarks: cleanBm.length, importedMemberships: slugs.length };
}
