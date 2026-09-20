import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from './client';
import { circles, circleMemberships, circlePins, economyAccounts, economyAwards, economyChallenges, economyEntries, economyPayments, economyQuotes, economyServiceOrders, economySubmissions } from './schema';

export const CREDIT_PACKS = [500, 1000, 2500] as const;
export const CREDIT_PIN_PRICE = 25;
const noFunds = () => new Error('Not enough Daybreak Credits. Add credits in You.');

export async function getEconomyAccount(userId: string) {
  const db = getDb();
  const [account, entries] = await Promise.all([
    db.select({ balanceCents: economyAccounts.balanceCents }).from(economyAccounts).where(eq(economyAccounts.userId, userId)).limit(1),
    db.select({ deltaCents: economyEntries.deltaCents, kind: economyEntries.kind, createdAt: economyEntries.createdAt }).from(economyEntries).where(eq(economyEntries.userId, userId)).orderBy(desc(economyEntries.createdAt)).limit(20),
  ]);
  return { balanceCents: account[0]?.balanceCents ?? 0, entries };
}

export async function createCreditQuote(userId: string, wallet: string, creditsCents: number) {
  if (!CREDIT_PACKS.includes(creditsCents as typeof CREDIT_PACKS[number])) throw new Error('Choose an available credit pack.');
  const [quote] = await getDb().insert(economyQuotes).values({ userId, wallet: wallet.toLowerCase(), creditsCents, amountRaw: String(creditsCents * 10_000), expiresAt: new Date(Date.now() + 10 * 60_000) }).returning();
  return { id: quote.id, creditsCents, amountRaw: quote.amountRaw, expiresAt: quote.expiresAt.toISOString() };
}

export async function readCreditQuote(userId: string, quoteId: string) {
  const [quote] = await getDb().select().from(economyQuotes).where(and(eq(economyQuotes.id, quoteId), eq(economyQuotes.userId, userId))).limit(1);
  return quote ?? null;
}

export async function confirmCreditPurchase(userId: string, quoteId: string, txHash: string) {
  return getDb().transaction(async tx => {
    const [existing] = await tx.select().from(economyPayments).where(eq(economyPayments.quoteId, quoteId)).limit(1);
    if (existing) {
      if (existing.userId === userId && existing.txHash === txHash.toLowerCase()) return { credited: false, creditsCents: existing.creditsCents };
      throw new Error('This quote already has a different payment.');
    }
    const [quote] = await tx.select().from(economyQuotes).where(and(eq(economyQuotes.id, quoteId), eq(economyQuotes.userId, userId))).limit(1);
    if (!quote) throw new Error('Quote not found.');
    const inserted = await tx.insert(economyPayments).values({ txHash: txHash.toLowerCase(), quoteId, userId, amountRaw: quote.amountRaw, creditsCents: quote.creditsCents }).onConflictDoNothing().returning({ txHash: economyPayments.txHash });
    if (!inserted.length) throw new Error('This transaction was already used for credits.');
    await tx.insert(economyAccounts).values({ userId, balanceCents: quote.creditsCents }).onConflictDoUpdate({ target: economyAccounts.userId, set: { balanceCents: sql`${economyAccounts.balanceCents} + ${quote.creditsCents}`, updatedAt: new Date() } });
    await tx.insert(economyEntries).values({ userId, deltaCents: quote.creditsCents, kind: 'purchase_usdc', reference: quoteId });
    return { credited: true, creditsCents: quote.creditsCents };
  });
}

async function debit(tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0], userId: string, cents: number) {
  const rows = await tx.update(economyAccounts).set({ balanceCents: sql`${economyAccounts.balanceCents} - ${cents}`, updatedAt: new Date() }).where(and(eq(economyAccounts.userId, userId), sql`${economyAccounts.balanceCents} >= ${cents}`)).returning({ balanceCents: economyAccounts.balanceCents });
  if (!rows.length) throw noFunds();
  return rows[0].balanceCents;
}

export async function pinCircleWithCredits(userId: string, slug: string, idempotencyKey: string) {
  return getDb().transaction(async tx => {
    const [old] = await tx.select().from(economyServiceOrders).where(and(eq(economyServiceOrders.userId, userId), eq(economyServiceOrders.idempotencyKey, idempotencyKey))).limit(1);
    if (old) {
      if (old.service !== 'circle_pin' || old.target !== slug) throw new Error('This request key was used for a different service.');
      return { alreadyApplied: true };
    }
    const [circle] = await tx.select({ id: circles.id, status: circles.status, owner: circles.creatorUserId, pinnedUntil: circles.pinnedUntil }).from(circles).where(eq(circles.slug, slug)).for('update').limit(1);
    if (!circle || circle.status !== 'active') throw new Error('Circle not found.');
    const [member] = await tx.select({ id: circleMemberships.id }).from(circleMemberships).where(and(eq(circleMemberships.circleId, circle.id), eq(circleMemberships.userId, userId), eq(circleMemberships.status, 'active'))).limit(1);
    if (!member && circle.owner !== userId) throw new Error('Join this Circle before pinning it.');
    await debit(tx, userId, CREDIT_PIN_PRICE);
    const [order] = await tx.insert(economyServiceOrders).values({ userId, idempotencyKey, service: 'circle_pin', target: slug, costCents: CREDIT_PIN_PRICE }).returning();
    const until = new Date(Math.max(Date.now(), circle.pinnedUntil?.getTime() ?? 0) + 48 * 3_600_000);
    await tx.insert(circlePins).values({ circleId: circle.id, userId, txHash: `credit:${order.id}`, amountRaw: '0', pinnedUntil: until });
    await tx.update(circles).set({ pinnedUntil: until }).where(eq(circles.id, circle.id));
    await tx.insert(economyEntries).values({ userId, deltaCents: -CREDIT_PIN_PRICE, kind: 'circle_pin', reference: order.id });
    return { alreadyApplied: false, pinnedUntil: until.toISOString() };
  });
}

export async function listCircleChallenges(slug: string, viewerId?: string) {
  const db = getDb();
  const rows = await db.select({ id: economyChallenges.id, title: economyChallenges.title, brief: economyChallenges.brief, criteria: economyChallenges.criteria, budgetCents: economyChallenges.budgetCents, deadline: economyChallenges.deadline, status: economyChallenges.status, sponsorUserId: economyChallenges.sponsorUserId }).from(economyChallenges).innerJoin(circles, eq(circles.id, economyChallenges.circleId)).where(and(eq(circles.slug, slug), eq(circles.status, 'active'))).orderBy(desc(economyChallenges.createdAt)).limit(20);
  return rows.map(({ sponsorUserId, ...rest }) => ({ ...rest, isSponsor: sponsorUserId === viewerId }));
}

export async function createChallenge(userId: string, slug: string, input: { title: string; brief: string; criteria: string; budgetCents: number; deadline: Date; idempotencyKey: string }) {
  return getDb().transaction(async tx => {
    const [existing] = await tx.select({ id: economyChallenges.id, circleId: economyChallenges.circleId, title: economyChallenges.title, budgetCents: economyChallenges.budgetCents }).from(economyChallenges).where(and(eq(economyChallenges.sponsorUserId, userId), eq(economyChallenges.idempotencyKey, input.idempotencyKey))).limit(1);
    if (existing) {
      const [sameCircle] = await tx.select({ id: circles.id }).from(circles).where(eq(circles.slug, slug)).limit(1);
      if (existing.circleId !== sameCircle?.id || existing.title !== input.title || existing.budgetCents !== input.budgetCents) throw new Error('This request key was used for a different challenge.');
      return { id: existing.id };
    }
    const [circle] = await tx.select({ id: circles.id, owner: circles.creatorUserId, status: circles.status }).from(circles).where(eq(circles.slug, slug)).limit(1);
    if (!circle || circle.status !== 'active') throw new Error('Circle not found.');
    const [member] = await tx.select({ id: circleMemberships.id }).from(circleMemberships).where(and(eq(circleMemberships.circleId, circle.id), eq(circleMemberships.userId, userId), eq(circleMemberships.status, 'active'))).limit(1);
    if (!member && circle.owner !== userId) throw new Error('Join this Circle before funding a challenge.');
    await debit(tx, userId, input.budgetCents);
    const [challenge] = await tx.insert(economyChallenges).values({ circleId: circle.id, sponsorUserId: userId, ...input }).returning({ id: economyChallenges.id });
    await tx.insert(economyEntries).values({ userId, deltaCents: -input.budgetCents, kind: 'challenge_escrow', reference: challenge.id });
    return challenge;
  });
}

export async function submitChallenge(userId: string, challengeId: string, workUrl: string, summary: string) {
  return getDb().transaction(async tx => {
    const [challenge] = await tx.select().from(economyChallenges).where(eq(economyChallenges.id, challengeId)).for('update').limit(1);
    if (!challenge || challenge.status !== 'open' || challenge.deadline <= new Date()) throw new Error('This challenge is closed.');
    if (challenge.sponsorUserId === userId) throw new Error('Sponsors cannot submit to their own challenge.');
    const [submission] = await tx.insert(economySubmissions).values({ challengeId, userId, workUrl, summary }).onConflictDoNothing().returning({ id: economySubmissions.id });
    if (!submission) throw new Error('You already submitted to this challenge.');
    return submission;
  });
}

export async function listChallengeSubmissions(userId: string, challengeId: string) {
  const db = getDb();
  const [challenge] = await db.select({ sponsorUserId: economyChallenges.sponsorUserId }).from(economyChallenges).where(eq(economyChallenges.id, challengeId)).limit(1);
  if (!challenge || challenge.sponsorUserId !== userId) throw new Error('Only the sponsor can review submissions.');
  return db.select({ id: economySubmissions.id, summary: economySubmissions.summary, workUrl: economySubmissions.workUrl, createdAt: economySubmissions.createdAt }).from(economySubmissions).where(eq(economySubmissions.challengeId, challengeId)).orderBy(economySubmissions.createdAt);
}

export async function awardChallenge(userId: string, challengeId: string, submissionId: string) {
  return getDb().transaction(async tx => {
    const [challenge] = await tx.select().from(economyChallenges).where(eq(economyChallenges.id, challengeId)).for('update').limit(1);
    if (!challenge || challenge.sponsorUserId !== userId) throw new Error('Challenge unavailable for award.');
    if (challenge.status === 'awarded') {
      const [previous] = await tx.select({ submissionId: economyAwards.submissionId }).from(economyAwards).where(eq(economyAwards.challengeId, challengeId)).limit(1);
      if (previous?.submissionId === submissionId) return { awarded: true, alreadyApplied: true };
      throw new Error('Challenge was already awarded to another submission.');
    }
    if (challenge.status !== 'open') throw new Error('Challenge unavailable for award.');
    const [submission] = await tx.select().from(economySubmissions).where(and(eq(economySubmissions.id, submissionId), eq(economySubmissions.challengeId, challengeId))).limit(1);
    if (!submission) throw new Error('Submission not found.');
    await tx.insert(economyAwards).values({ challengeId, submissionId, recipientUserId: submission.userId, creditsCents: challenge.budgetCents });
    await tx.update(economyChallenges).set({ status: 'awarded' }).where(eq(economyChallenges.id, challengeId));
    await tx.insert(economyAccounts).values({ userId: submission.userId, balanceCents: challenge.budgetCents }).onConflictDoUpdate({ target: economyAccounts.userId, set: { balanceCents: sql`${economyAccounts.balanceCents} + ${challenge.budgetCents}`, updatedAt: new Date() } });
    await tx.insert(economyEntries).values({ userId: submission.userId, deltaCents: challenge.budgetCents, kind: 'challenge_award', reference: challengeId });
    return { awarded: true };
  });
}

export async function cancelEmptyChallenge(userId: string, challengeId: string) {
  return getDb().transaction(async tx => {
    const [challenge] = await tx.select().from(economyChallenges).where(eq(economyChallenges.id, challengeId)).for('update').limit(1);
    if (!challenge || challenge.sponsorUserId !== userId) throw new Error('Challenge unavailable for refund.');
    if (challenge.status === 'cancelled') return { refundedCents: challenge.budgetCents, alreadyApplied: true };
    if (challenge.status !== 'open') throw new Error('Challenge unavailable for refund.');
    const [submission] = await tx.select({ id: economySubmissions.id }).from(economySubmissions).where(eq(economySubmissions.challengeId, challengeId)).limit(1);
    if (submission) throw new Error('A submitted challenge requires review; contact support to resolve it.');
    await tx.update(economyChallenges).set({ status: 'cancelled' }).where(eq(economyChallenges.id, challengeId));
    await tx.insert(economyAccounts).values({ userId, balanceCents: challenge.budgetCents }).onConflictDoUpdate({ target: economyAccounts.userId, set: { balanceCents: sql`${economyAccounts.balanceCents} + ${challenge.budgetCents}`, updatedAt: new Date() } });
    await tx.insert(economyEntries).values({ userId, deltaCents: challenge.budgetCents, kind: 'challenge_refund', reference: challengeId });
    return { refundedCents: challenge.budgetCents };
  });
}

export async function economyPublicStats() {
  const db = getDb();
  const [purchases] = await db.select({ cents: sql<string>`coalesce(sum(${economyPayments.creditsCents}),0)` }).from(economyPayments);
  const [balances] = await db.select({ cents: sql<string>`coalesce(sum(${economyAccounts.balanceCents}),0)` }).from(economyAccounts);
  const [services] = await db.select({ cents: sql<string>`coalesce(sum(${economyServiceOrders.costCents}),0)` }).from(economyServiceOrders);
  const [funded] = await db.select({ cents: sql<string>`coalesce(sum(${economyChallenges.budgetCents}),0)` }).from(economyChallenges).where(eq(economyChallenges.status, 'open'));
  const [awarded] = await db.select({ cents: sql<string>`coalesce(sum(${economyAwards.creditsCents}),0)` }).from(economyAwards);
  return { creditsPurchasedCents: Number(purchases.cents), outstandingCreditsCents: Number(balances.cents), servicesDeliveredCents: Number(services.cents), openChallengeCents: Number(funded.cents), creditsAwardedCents: Number(awarded.cents) };
}
