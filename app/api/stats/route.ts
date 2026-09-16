import 'server-only';
import { count, eq, isNotNull } from 'drizzle-orm';
import { getDb, isDbConfigured } from '@/lib/db/client';
import { users, tokenLaunches, museCreations, circles, circleMemberships, circleDiscoveries, communityTokens, linkedWallets } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

interface Stats { accounts: number | null; launches: number | null; creations: number | null; circles: number | null; members: number | null; messages: number | null; communityTokens: number | null; wallets: number | null }
let cache: { at: number; stats: Stats } | null = null;

// null = the count could not be read (distinct from a real 0), so the UI shows
// "unknown", never a fabricated zero.
const one = async (p: Promise<{ v: number }[]>): Promise<number | null> => { try { const [r] = await p; return Number(r?.v ?? 0); } catch { return null; } };

export async function GET() {
  if (!isDbConfigured) return Response.json({ configured: false }, { headers: { 'Cache-Control': 'no-store' } });
  if (cache && Date.now() - cache.at < 60_000) return Response.json({ configured: true, ...cache.stats, cached: true });
  const db = getDb();
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
  const stats: Stats = { accounts, launches, creations, circles: circleCount, members, messages, communityTokens: community, wallets };
  // Only cache a fully-read snapshot; a partial read shouldn't be served for 60s.
  if (Object.values(stats).every((v) => v !== null)) cache = { at: Date.now(), stats };
  return Response.json({ configured: true, ...stats });
}
