import 'server-only';
import { count, eq, isNotNull } from 'drizzle-orm';
import { getDb, isDbConfigured } from '@/lib/db/client';
import { users, tokenLaunches, museCreations, circles, circleMemberships, circleDiscoveries, communityTokens, linkedWallets } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

interface Stats { accounts: number; launches: number; creations: number; circles: number; members: number; messages: number; communityTokens: number; wallets: number }
let cache: { at: number; stats: Stats } | null = null;

const one = async (p: Promise<{ v: number }[]>) => { try { const [r] = await p; return Number(r?.v ?? 0); } catch { return 0; } };

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
  cache = { at: Date.now(), stats };
  return Response.json({ configured: true, ...stats });
}
