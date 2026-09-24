import 'server-only';
import { count, eq, isNotNull, sql } from 'drizzle-orm';
import { getDb, isDbConfigured } from '@/lib/db/client';
import { users, tokenLaunches, museCreations, circles, circleMemberships, circleDiscoveries, communityTokens, linkedWallets } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

interface Stats { accounts: number | null; launches: number | null; creations: number | null; circles: number | null; members: number | null; messages: number | null; communityTokens: number | null; wallets: number | null }
let cache: { at: number; stats: Stats } | null = null;
// Complete snapshots are shared at the CDN, so visitors are not held on a cold database connection.
const CACHED = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600', 'Access-Control-Allow-Origin': '*' };

// null = the count could not be read (distinct from a real 0), so the UI shows
// "unknown", never a fabricated zero.
const one = async (p: Promise<{ v: number }[]>): Promise<number | null> => { try { const [r] = await p; return Number(r?.v ?? 0); } catch { return null; } };
const num = (v: unknown): number | null => (v == null ? null : Number(v));

// One round trip on one connection. Falls back to per-table counts if it fails, so a single
// unreadable table degrades to one unknown number rather than a blank page.
async function readStats(): Promise<Stats> {
  const db = getDb();
  try {
    const rows = await db.execute(sql`select
      (select count(*) from ${users}) as accounts,
      (select count(*) from ${tokenLaunches} where ${tokenLaunches.tokenAddress} is not null) as launches,
      (select count(*) from ${museCreations} where ${museCreations.status} = 'completed') as creations,
      (select count(*) from ${circles}) as circles,
      (select count(*) from ${circleMemberships} where ${circleMemberships.status} = 'active') as members,
      (select count(*) from ${circleDiscoveries}) as messages,
      (select count(*) from ${communityTokens}) as community_tokens,
      (select count(*) from ${linkedWallets}) as wallets`);
    const r = (Array.isArray(rows) ? rows[0] : (rows as { rows?: Record<string, unknown>[] }).rows?.[0]) as Record<string, unknown> | undefined;
    if (!r) throw new Error('No stats row');
    return { accounts: num(r.accounts), launches: num(r.launches), creations: num(r.creations), circles: num(r.circles), members: num(r.members), messages: num(r.messages), communityTokens: num(r.community_tokens), wallets: num(r.wallets) };
  } catch {
    const [accounts, launches, creations, circleCount, members, messages, community, wallets] = await Promise.all([
      one(db.select({ v: count() }).from(users)),
      one(db.select({ v: count() }).from(tokenLaunches).where(isNotNull(tokenLaunches.tokenAddress))),
      one(db.select({ v: count() }).from(museCreations).where(eq(museCreations.status, 'completed'))),
      one(db.select({ v: count() }).from(circles)),
      one(db.select({ v: count() }).from(circleMemberships).where(eq(circleMemberships.status, 'active'))),
      one(db.select({ v: count() }).from(circleDiscoveries)),
      one(db.select({ v: count() }).from(communityTokens)),
      one(db.select({ v: count() }).from(linkedWallets)),
    ]);
    return { accounts, launches, creations, circles: circleCount, members, messages, communityTokens: community, wallets };
  }
}

export async function GET() {
  if (!isDbConfigured) return Response.json({ configured: false }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  if (cache && Date.now() - cache.at < 60_000) return Response.json({ configured: true, ...cache.stats, cached: true }, { headers: CACHED });
  const stats = await readStats();
  // Only cache a fully-read snapshot; a partial read shouldn't be served for 60s.
  const complete = Object.values(stats).every((v) => v !== null);
  if (complete) cache = { at: Date.now(), stats };
  return Response.json({ configured: true, ...stats }, { headers: complete ? CACHED : { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
}
