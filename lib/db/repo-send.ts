import 'server-only';
import { and, eq } from 'drizzle-orm';
import { getDb } from './client';
import { circles, circleMemberships, linkedWallets, profiles } from './schema';
import { isCircleMember } from './repo';

// "Let my circles send me stock": an explicit, revocable opt-in that lets fellow circle
// members resolve this user's verified EVM wallet (used on X Layer) as a transfer recipient.
// Stored on linked_wallets with namespace 'eip155' (chain-agnostic EVM address).
const EVM = 'eip155';

export async function getReceiveOptIn(userId: string): Promise<boolean> {
  const [row] = await getDb().select({ id: linkedWallets.id }).from(linkedWallets)
    .where(and(eq(linkedWallets.userId, userId), eq(linkedWallets.namespace, EVM), eq(linkedWallets.visibility, 'circles'))).limit(1);
  return !!row;
}

export async function setReceiveOptIn(userId: string, walletAddress: string, enabled: boolean): Promise<boolean> {
  const db = getDb();
  const address = walletAddress.toLowerCase();
  await db.transaction(async (tx) => {
    // One opted-in EVM wallet per user: clear any previous one first.
    await tx.update(linkedWallets).set({ visibility: 'private' }).where(and(eq(linkedWallets.userId, userId), eq(linkedWallets.namespace, EVM)));
    await tx.insert(linkedWallets).values({ userId, address, namespace: EVM, visibility: enabled ? 'circles' : 'private' })
      .onConflictDoUpdate({ target: [linkedWallets.namespace, linkedWallets.address], set: { userId, visibility: enabled ? 'circles' : 'private', verifiedAt: new Date() } });
  });
  return enabled;
}

export type SendTarget =
  | { ok: true; address: `0x${string}`; displayName: string; handle: string | null }
  | { ok: false; reason: 'membership' | 'missing' | 'self' | 'not_receiving' };

/** Resolve a circle member to a transfer address. Both people must be active members of the
 * circle and the recipient must have opted in; otherwise no address is disclosed. */
export async function resolveSendTarget(senderId: string, slug: string, memberRef: string): Promise<SendTarget> {
  if (!(await isCircleMember(senderId, slug))) return { ok: false, reason: 'membership' };
  const db = getDb();
  const [circle] = await db.select({ id: circles.id }).from(circles).where(and(eq(circles.slug, slug), eq(circles.status, 'active'))).limit(1);
  if (!circle) return { ok: false, reason: 'missing' };
  const [member] = await db.select({ userId: circleMemberships.userId, displayName: profiles.displayName, handle: profiles.handle })
    .from(circleMemberships).innerJoin(profiles, eq(profiles.userId, circleMemberships.userId))
    .where(and(eq(circleMemberships.id, memberRef), eq(circleMemberships.circleId, circle.id), eq(circleMemberships.status, 'active'))).limit(1);
  if (!member) return { ok: false, reason: 'missing' };
  if (member.userId === senderId) return { ok: false, reason: 'self' };
  const [wallet] = await db.select({ address: linkedWallets.address }).from(linkedWallets)
    .where(and(eq(linkedWallets.userId, member.userId), eq(linkedWallets.namespace, EVM), eq(linkedWallets.visibility, 'circles'))).limit(1);
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet.address)) return { ok: false, reason: 'not_receiving' };
  return { ok: true, address: wallet.address as `0x${string}`, displayName: member.displayName, handle: member.handle };
}
