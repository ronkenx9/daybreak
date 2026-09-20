import 'server-only';
import { and, desc, eq, gte, inArray, lt, ne, sql } from 'drizzle-orm';
import { getDb } from './client';
import { circles, circleMemberships, circlePins, economyAccounts, economyAwards, economyChallenges, economyDisputes, economyEntries, economyPayments, economyQuotes, economyRefundRequests, economyResearchJobs, economyResearchSettings, economyServiceOrders, economySubmissions } from './schema';
import { RESEARCH_FREE_PER_DAY, RESEARCH_MEMBER_DISCOUNTS_PER_MONTH, RESEARCH_MEMBER_PRICE_CENTS, RESEARCH_PRICE_CENTS } from '@/lib/economy/pricing';
import type { ResearchResult } from '@/lib/economy/research';
import { economyReviewConfigured } from '@/lib/economy/config';

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

const utcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const utcMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
async function recoverStaleResearchInTx(tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0], userId: string, now: Date) {
  const stale = await tx.select().from(economyResearchJobs).where(and(eq(economyResearchJobs.userId, userId), eq(economyResearchJobs.status, 'pending'), lt(economyResearchJobs.createdAt, new Date(now.getTime() - 120_000)))).for('update');
  for (const job of stale) {
    await tx.update(economyResearchJobs).set({ status: 'failed', updatedAt: now }).where(eq(economyResearchJobs.id, job.id));
    if (job.costCents) {
      await tx.update(economyAccounts).set({ balanceCents: sql`${economyAccounts.balanceCents} + ${job.costCents}`, updatedAt: now }).where(eq(economyAccounts.userId, userId));
      await tx.insert(economyEntries).values({ userId, deltaCents: job.costCents, kind: 'research_refund', reference: job.id });
    }
  }
}
export async function recoverStaleResearchJobs(userId: string, now = new Date()) {
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(91325, hashtext(${userId}))`);
    await recoverStaleResearchInTx(tx, userId, now);
  });
}
export async function getResearchDashboard(userId: string, now = new Date()) {
  await recoverStaleResearchJobs(userId, now);
  const db = getDb();
  const [settings, jobs, today] = await Promise.all([
    db.select({ dailySpendCapCents: economyResearchSettings.dailySpendCapCents }).from(economyResearchSettings).where(eq(economyResearchSettings.userId, userId)).limit(1),
    db.select().from(economyResearchJobs).where(eq(economyResearchJobs.userId, userId)).orderBy(desc(economyResearchJobs.createdAt)).limit(12),
    db.select({ count: sql<string>`count(*)`, spent: sql<string>`coalesce(sum(${economyResearchJobs.costCents}),0)` }).from(economyResearchJobs).where(and(eq(economyResearchJobs.userId, userId), gte(economyResearchJobs.createdAt, utcDay(now)), ne(economyResearchJobs.status, 'failed'))),
  ]);
  return { dailySpendCapCents: settings[0]?.dailySpendCapCents ?? 100, spentTodayCents: Number(today[0].spent), freeRemainingToday: Math.max(0, RESEARCH_FREE_PER_DAY - Number(today[0].count)), priceCents: RESEARCH_PRICE_CENTS, memberPriceCents: RESEARCH_MEMBER_PRICE_CENTS, jobs };
}

export async function setResearchSpendCap(userId: string, cents: number) {
  if (!Number.isInteger(cents) || cents < 0 || cents > 1000) throw new Error('Choose a daily cap between $0 and $10.');
  await getDb().insert(economyResearchSettings).values({ userId, dailySpendCapCents: cents }).onConflictDoUpdate({ target: economyResearchSettings.userId, set: { dailySpendCapCents: cents, updatedAt: new Date() } });
  return { dailySpendCapCents: cents };
}

export async function startResearchJob(userId: string, symbol: string, idempotencyKey: string, maxCostCents: number, member: boolean, now = new Date()) {
  return getDb().transaction(async tx => {
    // One user's free allowance and spend cap are serialized across tabs.
    await tx.execute(sql`select pg_advisory_xact_lock(91325, hashtext(${userId}))`);
    await recoverStaleResearchInTx(tx, userId, now);
    const [old] = await tx.select().from(economyResearchJobs).where(and(eq(economyResearchJobs.userId, userId), eq(economyResearchJobs.idempotencyKey, idempotencyKey))).limit(1);
    if (old) {
      if (old.symbol !== symbol) throw new Error('This request key belongs to another stock.');
      return { job: old, created: false };
    }
    const [today] = await tx.select({ count: sql<string>`count(*)`, spent: sql<string>`coalesce(sum(${economyResearchJobs.costCents}),0)` }).from(economyResearchJobs).where(and(eq(economyResearchJobs.userId, userId), gte(economyResearchJobs.createdAt, utcDay(now)), ne(economyResearchJobs.status, 'failed')));
    let costCents = Number(today.count) < RESEARCH_FREE_PER_DAY ? 0 : RESEARCH_PRICE_CENTS;
    let memberDiscountCents = 0;
    if (costCents && member) {
      await tx.execute(sql`select pg_advisory_xact_lock(91326, 1)`);
      const [monthly] = await tx.select({ count: sql<string>`count(*)` }).from(economyResearchJobs).where(and(gte(economyResearchJobs.createdAt, utcMonth(now)), ne(economyResearchJobs.status, 'failed'), sql`${economyResearchJobs.memberDiscountCents} > 0`));
      if (Number(monthly.count) < RESEARCH_MEMBER_DISCOUNTS_PER_MONTH) { costCents = RESEARCH_MEMBER_PRICE_CENTS; memberDiscountCents = RESEARCH_PRICE_CENTS - costCents; }
    }
    if (!Number.isInteger(maxCostCents) || maxCostCents < costCents) throw new Error('Price changed. Review the current brief price before continuing.');
    const [setting] = await tx.select().from(economyResearchSettings).where(eq(economyResearchSettings.userId, userId)).limit(1);
    if (Number(today.spent) + costCents > (setting?.dailySpendCapCents ?? 100)) throw new Error('This brief exceeds your daily research spending cap.');
    if (costCents) await debit(tx, userId, costCents);
    const [job] = await tx.insert(economyResearchJobs).values({ userId, symbol, idempotencyKey, costCents, memberDiscountCents }).returning();
    if (costCents) await tx.insert(economyEntries).values({ userId, deltaCents: -costCents, kind: 'research_reserve', reference: job.id });
    return { job, created: true };
  });
}

export async function finishResearchJob(userId: string, jobId: string, result: ResearchResult) {
  const [job] = await getDb().update(economyResearchJobs).set({ status: 'completed', result, updatedAt: new Date() }).where(and(eq(economyResearchJobs.id, jobId), eq(economyResearchJobs.userId, userId), eq(economyResearchJobs.status, 'pending'))).returning();
  if (!job) throw new Error('Research reservation expired. No credits were kept.');
  return job;
}

export async function failResearchJob(userId: string, jobId: string) {
  return getDb().transaction(async tx => {
    const [job] = await tx.select().from(economyResearchJobs).where(and(eq(economyResearchJobs.id, jobId), eq(economyResearchJobs.userId, userId))).for('update').limit(1);
    if (!job || job.status !== 'pending') return false;
    await tx.update(economyResearchJobs).set({ status: 'failed', updatedAt: new Date() }).where(eq(economyResearchJobs.id, jobId));
    if (job.costCents) {
      await tx.update(economyAccounts).set({ balanceCents: sql`${economyAccounts.balanceCents} + ${job.costCents}`, updatedAt: new Date() }).where(eq(economyAccounts.userId, userId));
      await tx.insert(economyEntries).values({ userId, deltaCents: job.costCents, kind: 'research_refund', reference: job.id });
    }
    return true;
  });
}

export async function listCreditRefunds(userId: string) {
  const db = getDb();
  const [payments, requests, refundable] = await Promise.all([
    db.select({ txHash: economyPayments.txHash, creditsCents: economyPayments.creditsCents, wallet: economyQuotes.wallet, createdAt: economyPayments.createdAt }).from(economyPayments).innerJoin(economyQuotes, eq(economyQuotes.id, economyPayments.quoteId)).where(eq(economyPayments.userId, userId)).orderBy(desc(economyPayments.createdAt)).limit(20),
    db.select().from(economyRefundRequests).where(eq(economyRefundRequests.userId, userId)).orderBy(desc(economyRefundRequests.createdAt)).limit(20),
    purchasedCreditRemainder(db, userId),
  ]);
  const reserved = await db.select({ paymentTxHash: economyRefundRequests.paymentTxHash, cents: sql<string>`sum(${economyRefundRequests.amountCents})` }).from(economyRefundRequests).where(sql`${economyRefundRequests.status} in ('pending','processing','fulfilled')`).groupBy(economyRefundRequests.paymentTxHash);
  const used = new Map(reserved.map(row => [row.paymentTxHash, Number(row.cents)]));
  return { refundableCents: refundable, payments: payments.map(payment => ({ ...payment, remainingCents: Math.max(0, payment.creditsCents - (used.get(payment.txHash) ?? 0)) })), requests };
}

// Credit awards may pay for services but cannot be cashed out as a user's own
// purchase. Consume purchased credits first for all spending, conservatively.
async function purchasedCreditRemainder(db: ReturnType<typeof getDb> | Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0], userId: string) {
  const [row] = await db.select({ cents: sql<string>`coalesce(sum(case when ${economyEntries.kind} in ('purchase_usdc','circle_pin','challenge_escrow','challenge_refund','research_reserve','research_refund','refund_reserved','refund_cancelled','refund_denied') then ${economyEntries.deltaCents} else 0 end),0)` }).from(economyEntries).where(eq(economyEntries.userId, userId));
  return Math.max(0, Number(row.cents));
}

export async function requestCreditRefund(userId: string, paymentTxHash: string, amountCents: number, reason: string) {
  return getDb().transaction(async tx => {
    const [payment] = await tx.select({ txHash: economyPayments.txHash, creditsCents: economyPayments.creditsCents, wallet: economyQuotes.wallet }).from(economyPayments).innerJoin(economyQuotes, eq(economyQuotes.id, economyPayments.quoteId)).where(and(eq(economyPayments.txHash, paymentTxHash), eq(economyPayments.userId, userId))).for('update').limit(1);
    if (!payment) throw new Error('Original credit purchase not found.');
    await tx.select({ userId: economyAccounts.userId }).from(economyAccounts).where(eq(economyAccounts.userId, userId)).for('update').limit(1);
    if (amountCents > await purchasedCreditRemainder(tx, userId)) throw new Error('Only unused credits from your own purchases can be refunded.');
    const [reserved] = await tx.select({ cents: sql<string>`coalesce(sum(${economyRefundRequests.amountCents}),0)` }).from(economyRefundRequests).where(and(eq(economyRefundRequests.paymentTxHash, paymentTxHash), sql`${economyRefundRequests.status} in ('pending','processing','fulfilled')`));
    if (!Number.isInteger(amountCents) || amountCents < 1 || amountCents > payment.creditsCents - Number(reserved.cents)) throw new Error('Request only unused credits from this purchase.');
    if (reason.trim().length < 10 || reason.trim().length > 1000) throw new Error('Add a short reason for the refund request.');
    await debit(tx, userId, amountCents);
    const [request] = await tx.insert(economyRefundRequests).values({ userId, paymentTxHash, wallet: payment.wallet, amountCents, reason: reason.trim() }).returning();
    await tx.insert(economyEntries).values({ userId, deltaCents: -amountCents, kind: 'refund_reserved', reference: request.id });
    return request;
  });
}

export async function cancelCreditRefund(userId: string, requestId: string) {
  return getDb().transaction(async tx => {
    const [request] = await tx.select().from(economyRefundRequests).where(and(eq(economyRefundRequests.id, requestId), eq(economyRefundRequests.userId, userId))).for('update').limit(1);
    if (!request || request.status !== 'pending') throw new Error('This refund request cannot be cancelled.');
    await tx.update(economyRefundRequests).set({ status: 'cancelled', resolvedAt: new Date() }).where(eq(economyRefundRequests.id, requestId));
    await tx.update(economyAccounts).set({ balanceCents: sql`${economyAccounts.balanceCents} + ${request.amountCents}`, updatedAt: new Date() }).where(eq(economyAccounts.userId, userId));
    await tx.insert(economyEntries).values({ userId, deltaCents: request.amountCents, kind: 'refund_cancelled', reference: requestId });
    return { cancelled: true };
  });
}

export async function readPendingCreditRefund(requestId: string) {
  const [request] = await getDb().select().from(economyRefundRequests).where(and(eq(economyRefundRequests.id, requestId), sql`${economyRefundRequests.status} in ('pending','processing')`)).limit(1);
  return request ?? null;
}

export async function resolveCreditRefund(requestId: string, decision: 'processing' | 'fulfilled' | 'denied', reviewerUserId: string, note: string, refundTxHash?: string) {
  return getDb().transaction(async tx => {
    const [request] = await tx.select().from(economyRefundRequests).where(eq(economyRefundRequests.id, requestId)).for('update').limit(1);
    if (!request || !['pending','processing'].includes(request.status)) throw new Error('Refund request is no longer open.');
    if (request.userId === reviewerUserId) throw new Error('An operator cannot review their own refund.');
    if (note.trim().length < 10 || note.trim().length > 1000) throw new Error('Record a 10–1000 character operator note.');
    if (decision === 'processing' && request.status !== 'pending') throw new Error('Refund is already being processed.');
    if (decision === 'fulfilled' && request.status !== 'processing') throw new Error('Claim this refund before sending USDC.');
    if (decision === 'fulfilled' && !refundTxHash) throw new Error('A verified Base USDC refund transaction is required.');
    await tx.update(economyRefundRequests).set({ status: decision, refundTxHash: decision === 'fulfilled' ? refundTxHash?.toLowerCase() : null, reviewerUserId, resolutionNote: note.trim(), resolvedAt: decision === 'processing' ? null : new Date() }).where(eq(economyRefundRequests.id, requestId));
    if (decision === 'denied') {
      await tx.update(economyAccounts).set({ balanceCents: sql`${economyAccounts.balanceCents} + ${request.amountCents}`, updatedAt: new Date() }).where(eq(economyAccounts.userId, request.userId));
      await tx.insert(economyEntries).values({ userId: request.userId, deltaCents: request.amountCents, kind: 'refund_denied', reference: requestId });
    }
    return { status: decision };
  });
}

export async function fileChallengeDispute(userId: string, challengeId: string, reason: string) {
  if (reason.trim().length < 20 || reason.trim().length > 1000) throw new Error('Describe the issue in 20–1000 characters.');
  return getDb().transaction(async tx => {
    const [challenge] = await tx.select().from(economyChallenges).where(eq(economyChallenges.id, challengeId)).for('update').limit(1);
    if (!challenge || challenge.status !== 'open') throw new Error('Only an open challenge can be disputed.');
    const [submission] = await tx.select({ id: economySubmissions.id }).from(economySubmissions).where(and(eq(economySubmissions.challengeId, challengeId), eq(economySubmissions.userId, userId))).limit(1);
    if (challenge.sponsorUserId !== userId && !submission) throw new Error('Only the sponsor or a contributor can dispute this challenge.');
    await tx.insert(economyDisputes).values({ challengeId, filedByUserId: userId, reason: reason.trim() });
    await tx.update(economyChallenges).set({ status: 'disputed' }).where(eq(economyChallenges.id, challengeId));
    return { status: 'open' as const };
  });
}

export async function resolveChallengeDispute(challengeId: string, decision: 'award' | 'refund', note: string, reviewerUserId: string, submissionId?: string) {
  if (note.trim().length < 20 || note.trim().length > 1000) throw new Error('Record a 20–1000 character resolution note.');
  return getDb().transaction(async tx => {
    const [challenge] = await tx.select().from(economyChallenges).where(eq(economyChallenges.id, challengeId)).for('update').limit(1);
    const [dispute] = await tx.select().from(economyDisputes).where(eq(economyDisputes.challengeId, challengeId)).limit(1);
    if (!challenge || !dispute || challenge.status !== 'disputed' || dispute.status !== 'open') throw new Error('This dispute is no longer open.');
    const [reviewerSubmission] = await tx.select({ id: economySubmissions.id }).from(economySubmissions).where(and(eq(economySubmissions.challengeId, challengeId), eq(economySubmissions.userId, reviewerUserId))).limit(1);
    if (challenge.sponsorUserId === reviewerUserId || reviewerSubmission) throw new Error('An operator cannot resolve their own challenge.');
    let status: 'awarded' | 'cancelled' = 'cancelled';
    if (decision === 'award') {
      const [submission] = await tx.select().from(economySubmissions).where(and(eq(economySubmissions.id, submissionId ?? ''), eq(economySubmissions.challengeId, challengeId))).limit(1);
      if (!submission) throw new Error('Select a valid submission to award.');
      await tx.insert(economyAwards).values({ challengeId, submissionId: submission.id, recipientUserId: submission.userId, creditsCents: challenge.budgetCents });
      await tx.insert(economyAccounts).values({ userId: submission.userId, balanceCents: challenge.budgetCents }).onConflictDoUpdate({ target: economyAccounts.userId, set: { balanceCents: sql`${economyAccounts.balanceCents} + ${challenge.budgetCents}`, updatedAt: new Date() } });
      await tx.insert(economyEntries).values({ userId: submission.userId, deltaCents: challenge.budgetCents, kind: 'challenge_award', reference: challengeId });
      status = 'awarded';
    } else if (decision === 'refund') {
      await tx.insert(economyAccounts).values({ userId: challenge.sponsorUserId, balanceCents: challenge.budgetCents }).onConflictDoUpdate({ target: economyAccounts.userId, set: { balanceCents: sql`${economyAccounts.balanceCents} + ${challenge.budgetCents}`, updatedAt: new Date() } });
      await tx.insert(economyEntries).values({ userId: challenge.sponsorUserId, deltaCents: challenge.budgetCents, kind: 'challenge_refund', reference: challengeId });
      status = 'cancelled';
    }
    await tx.update(economyChallenges).set({ status }).where(eq(economyChallenges.id, challengeId));
    await tx.update(economyDisputes).set({ status: decision === 'award' ? 'awarded' : 'refunded', reviewerUserId, resolutionNote: note.trim(), resolvedAt: new Date() }).where(eq(economyDisputes.challengeId, challengeId));
    return { status };
  });
}

export async function listEconomyOperatorQueue() {
  const db = getDb();
  const [refunds, disputes] = await Promise.all([
    db.select().from(economyRefundRequests).where(sql`${economyRefundRequests.status} in ('pending','processing')`).orderBy(economyRefundRequests.createdAt).limit(100),
    db.select({ challengeId: economyDisputes.challengeId, filedByUserId: economyDisputes.filedByUserId, reason: economyDisputes.reason, createdAt: economyDisputes.createdAt, title: economyChallenges.title, budgetCents: economyChallenges.budgetCents, sponsorUserId: economyChallenges.sponsorUserId }).from(economyDisputes).innerJoin(economyChallenges, eq(economyChallenges.id, economyDisputes.challengeId)).where(eq(economyDisputes.status, 'open')).orderBy(economyDisputes.createdAt).limit(100),
  ]);
  const submissions = disputes.length ? await db.select({ id: economySubmissions.id, challengeId: economySubmissions.challengeId, summary: economySubmissions.summary, workUrl: economySubmissions.workUrl }).from(economySubmissions).where(inArray(economySubmissions.challengeId, disputes.map(item => item.challengeId))) : [];
  return { refunds, disputes: disputes.map(dispute => ({ ...dispute, submissions: submissions.filter(item => item.challengeId === dispute.challengeId) })) };
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
  const ownSubmissions = viewerId ? await db.select({ challengeId: economySubmissions.challengeId }).from(economySubmissions).where(eq(economySubmissions.userId, viewerId)) : [];
  const submitted = new Set(ownSubmissions.map(row => row.challengeId));
  return rows.map(({ sponsorUserId, ...rest }) => ({ ...rest, isSponsor: sponsorUserId === viewerId, canDispute: economyReviewConfigured() && rest.status === 'open' && (sponsorUserId === viewerId || submitted.has(rest.id)) }));
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
  const [research] = await db.select({ cents: sql<string>`coalesce(sum(${economyResearchJobs.costCents}),0)` }).from(economyResearchJobs).where(eq(economyResearchJobs.status, 'completed'));
  const [funded] = await db.select({ cents: sql<string>`coalesce(sum(${economyChallenges.budgetCents}),0)` }).from(economyChallenges).where(sql`${economyChallenges.status} in ('open','disputed')`);
  const [awarded] = await db.select({ cents: sql<string>`coalesce(sum(${economyAwards.creditsCents}),0)` }).from(economyAwards);
  const [pendingRefunds] = await db.select({ cents: sql<string>`coalesce(sum(${economyRefundRequests.amountCents}),0)` }).from(economyRefundRequests).where(sql`${economyRefundRequests.status} in ('pending','processing')`);
  const [fulfilledRefunds] = await db.select({ cents: sql<string>`coalesce(sum(${economyRefundRequests.amountCents}),0)` }).from(economyRefundRequests).where(eq(economyRefundRequests.status, 'fulfilled'));
  const [pendingResearch] = await db.select({ cents: sql<string>`coalesce(sum(${economyResearchJobs.costCents}),0)` }).from(economyResearchJobs).where(eq(economyResearchJobs.status, 'pending'));
  return { creditsPurchasedCents: Number(purchases.cents), creditsRefundedCents: Number(fulfilledRefunds.cents), outstandingCreditsCents: Number(balances.cents), servicesDeliveredCents: Number(services.cents) + Number(research.cents), openChallengeCents: Number(funded.cents), creditsAwardedCents: Number(awarded.cents), pendingRefundCents: Number(pendingRefunds.cents), pendingResearchCents: Number(pendingResearch.cents) };
}
