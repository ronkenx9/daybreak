import 'server-only';
import { and, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { getDb } from './client';
import { operations, paperPositions, paperStockBalances, paperThesisMarkets, paperTrades, profiles, theses, thesisMarkets, thesisTradeQuotes } from './schema';
import type { ThesisDraftInput } from '@/lib/theses/model';
import type { ThesisLaunchBuild } from '@/lib/solana/dbc/launch';
import { PAPER_STARTING_BASE_RESERVE, PAPER_STARTING_QUOTE_RESERVE, PAPER_STARTING_STOCK_BALANCE, paperPositionMetrics, paperSpotPrice, quotePaperTrade, type PaperDirection, type PublicPaperThesisInput } from '@/lib/theses/paper';

export async function createThesisDraft(userId: string, slug: string, companyId: string, input: ThesisDraftInput) {
  const db = getDb();
  const [row] = await db.insert(theses).values({
    slug, authorUserId: userId, instrumentId: input.instrumentId,
    companyId, title: input.title, summary: input.summary, body: input.body,
    invalidation: input.invalidation, horizon: input.horizon, sources: input.sources,
    tokenName: input.tokenName, tokenSymbol: input.tokenSymbol,
  }).returning();
  return row;
}

export async function setThesisCompany(thesisId: string, userId: string, companyId: string) {
  const db = getDb();
  const [row] = await db.update(theses).set({ companyId, updatedAt: new Date() })
    .where(and(eq(theses.id, thesisId), eq(theses.authorUserId, userId), eq(theses.status, 'draft'))).returning();
  return row ?? null;
}

export async function updateThesisDraft(thesisId: string, userId: string, companyId: string, input: ThesisDraftInput) {
  const db = getDb();
  const [row] = await db.update(theses).set({
    instrumentId: input.instrumentId, companyId, title: input.title, summary: input.summary,
    body: input.body, invalidation: input.invalidation, horizon: input.horizon,
    sources: input.sources, tokenName: input.tokenName, tokenSymbol: input.tokenSymbol,
    updatedAt: new Date(),
  }).where(and(eq(theses.id, thesisId), eq(theses.authorUserId, userId), eq(theses.status, 'draft'))).returning();
  return row ?? null;
}

export async function getOwnedThesis(thesisId: string, userId: string) {
  const db = getDb();
  const [row] = await db.select().from(theses)
    .where(and(eq(theses.id, thesisId), eq(theses.authorUserId, userId))).limit(1);
  return row ?? null;
}

export async function listPublishedTheses(limit = 40) {
  const db = getDb();
  return db.select({
    id: theses.id, slug: theses.slug, instrumentId: theses.instrumentId, companyId: theses.companyId,
    title: theses.title, summary: theses.summary, body: theses.body, invalidation: theses.invalidation,
    horizon: theses.horizon, sources: theses.sources, tokenName: theses.tokenName,
    tokenSymbol: theses.tokenSymbol, mode: theses.mode, status: theses.status, publishedAt: theses.publishedAt,
    authorName: profiles.displayName, authorAvatar: profiles.avatar, authorAvatarUrl: profiles.avatarUrl,
    marketId: thesisMarkets.id, marketStatus: thesisMarkets.status, poolAddress: thesisMarkets.poolAddress,
    baseMint: thesisMarkets.baseMint, quoteMint: thesisMarkets.quoteMint,
    quoteDecimals: thesisMarkets.quoteDecimals, configVersion: thesisMarkets.configVersion,
    txSignature: thesisMarkets.txSignature, terms: thesisMarkets.terms,
    paperBaseReserve: paperThesisMarkets.baseReserve, paperQuoteReserve: paperThesisMarkets.quoteReserve,
    paperTradeCount: paperThesisMarkets.tradeCount,
  }).from(theses)
    .leftJoin(thesisMarkets, eq(thesisMarkets.thesisId, theses.id))
    .leftJoin(paperThesisMarkets, eq(paperThesisMarkets.thesisId, theses.id))
    .leftJoin(profiles, eq(profiles.userId, theses.authorUserId))
    .where(and(eq(theses.visibility, 'public'), inArray(theses.status, ['published', 'withdrawn']), or(eq(theses.mode, 'paper'), inArray(thesisMarkets.status, ['active', 'migrated']))))
    .orderBy(desc(theses.publishedAt)).limit(Math.max(1, Math.min(limit, 100)));
}

export async function getPublicThesis(idOrSlug: string) {
  const db = getDb();
  const rows = await db.select({
    id: theses.id, slug: theses.slug, instrumentId: theses.instrumentId, companyId: theses.companyId,
    title: theses.title, summary: theses.summary, body: theses.body, invalidation: theses.invalidation,
    horizon: theses.horizon, sources: theses.sources, tokenName: theses.tokenName,
    tokenSymbol: theses.tokenSymbol, mode: theses.mode, status: theses.status, publishedAt: theses.publishedAt,
    authorName: profiles.displayName, authorAvatar: profiles.avatar, authorAvatarUrl: profiles.avatarUrl,
    marketId: thesisMarkets.id, marketStatus: thesisMarkets.status, poolAddress: thesisMarkets.poolAddress,
    baseMint: thesisMarkets.baseMint, quoteMint: thesisMarkets.quoteMint,
    quoteDecimals: thesisMarkets.quoteDecimals, configAddress: thesisMarkets.configAddress,
    configVersion: thesisMarkets.configVersion, txSignature: thesisMarkets.txSignature, terms: thesisMarkets.terms,
    paperBaseReserve: paperThesisMarkets.baseReserve, paperQuoteReserve: paperThesisMarkets.quoteReserve,
    paperTradeCount: paperThesisMarkets.tradeCount,
  }).from(theses).leftJoin(thesisMarkets, eq(thesisMarkets.thesisId, theses.id))
    .leftJoin(paperThesisMarkets, eq(paperThesisMarkets.thesisId, theses.id))
    .leftJoin(profiles, eq(profiles.userId, theses.authorUserId))
    .where(and(
      sql`(${theses.id}::text = ${idOrSlug} OR ${theses.slug} = ${idOrSlug})`,
      eq(theses.visibility, 'public'), inArray(theses.status, ['published', 'withdrawn']),
      or(eq(theses.mode, 'paper'), inArray(thesisMarkets.status, ['active', 'migrated'])),
    )).limit(1);
  return rows[0] ?? null;
}

export async function createPublicPaperThesis(userId: string, slug: string, companyId: string, input: PublicPaperThesisInput) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const now = new Date();
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 2))`);
    const [recent] = await tx.select({ value: count() }).from(theses).where(and(eq(theses.authorUserId, userId), eq(theses.mode, 'paper'), sql`${theses.createdAt} > now() - interval '24 hours'`));
    if (Number(recent?.value??0) >= 5) throw new Error('PAPER_THESIS_DAILY_LIMIT');
    const [thesis] = await tx.insert(theses).values({
      slug, authorUserId: userId, instrumentId: input.instrumentId, companyId,
      title: input.title, summary: input.summary, body: input.summary,
      invalidation: 'This is a public simulation. Its activity does not prove the real-world thesis or guarantee a live-market outcome.',
      sources: [], tokenName: input.tokenName, tokenSymbol: input.tokenSymbol,
      mode: 'paper', status: 'published', visibility: 'public', publishedAt: now,
    }).returning();
    await tx.insert(paperThesisMarkets).values({
      thesisId: thesis.id, baseReserve: PAPER_STARTING_BASE_RESERVE,
      quoteReserve: PAPER_STARTING_QUOTE_RESERVE,
    });
    return thesis;
  });
}

export async function getPublicPaperMarket(thesisId: string, viewerUserId?: string) {
  const db = getDb();
  const [row] = await db.select({
    thesisId: theses.id, instrumentId: theses.instrumentId, companyId: theses.companyId,
    title: theses.title, summary: theses.summary, tokenName: theses.tokenName,
    tokenSymbol: theses.tokenSymbol, slug: theses.slug,
    baseReserve: paperThesisMarkets.baseReserve, quoteReserve: paperThesisMarkets.quoteReserve,
    tradeCount: paperThesisMarkets.tradeCount, updatedAt: paperThesisMarkets.updatedAt,
  }).from(theses).innerJoin(paperThesisMarkets, eq(paperThesisMarkets.thesisId, theses.id))
    .where(and(eq(theses.id, thesisId), eq(theses.mode, 'paper'), eq(theses.status, 'published'), eq(theses.visibility, 'public'))).limit(1);
  if (!row) return null;
  const spotPrice = paperSpotPrice(row);
  const positionRows = await db.select({
    userId: paperPositions.userId, quantity: paperPositions.quantity,
    costBasisQuote: paperPositions.costBasisQuote, realizedPnlQuote: paperPositions.realizedPnlQuote,
    updatedAt: paperPositions.updatedAt, displayName: profiles.displayName,
    avatar: profiles.avatar, avatarUrl: profiles.avatarUrl, stockBalance: paperStockBalances.balance,
  }).from(paperPositions).leftJoin(profiles, eq(profiles.userId, paperPositions.userId))
    .leftJoin(paperStockBalances, and(eq(paperStockBalances.userId, paperPositions.userId), eq(paperStockBalances.instrumentId, row.instrumentId)))
    .where(eq(paperPositions.thesisId, thesisId)).orderBy(desc(paperPositions.quantity)).limit(50);
  const positions = positionRows.map(({ userId, ...position }) => ({
    ...position, ...paperPositionMetrics(position, spotPrice), isViewer: viewerUserId === userId,
  }));
  const tradeRows = await db.select({
    id: paperTrades.id, userId: paperTrades.userId, direction: paperTrades.direction,
    inputAmount: paperTrades.inputAmount, outputAmount: paperTrades.outputAmount,
    feeAmount: paperTrades.feeAmount, priceImpactPct: paperTrades.priceImpactPct,
    executedAt: paperTrades.executedAt, displayName: profiles.displayName,
    avatar: profiles.avatar, avatarUrl: profiles.avatarUrl,
  }).from(paperTrades).leftJoin(profiles, eq(profiles.userId, paperTrades.userId))
    .where(eq(paperTrades.thesisId, thesisId)).orderBy(desc(paperTrades.executedAt)).limit(50);
  const trades = tradeRows.map(({ userId, ...trade }) => ({ ...trade, isViewer: viewerUserId === userId }));
  const balances = await db.select({
    balance: paperStockBalances.balance, updatedAt: paperStockBalances.updatedAt,
    displayName: profiles.displayName, avatar: profiles.avatar, avatarUrl: profiles.avatarUrl,
    userId: paperStockBalances.userId,
  }).from(paperStockBalances).leftJoin(profiles, eq(profiles.userId, paperStockBalances.userId))
    .where(eq(paperStockBalances.instrumentId, row.instrumentId)).orderBy(desc(paperStockBalances.balance)).limit(50);
  let viewerPosition = positions.find((position) => position.isViewer) ?? null;
  if (viewerUserId && !viewerPosition) {
    const [viewerPositionRow] = await db.select({
      quantity: paperPositions.quantity, costBasisQuote: paperPositions.costBasisQuote,
      realizedPnlQuote: paperPositions.realizedPnlQuote, updatedAt: paperPositions.updatedAt,
      displayName: profiles.displayName, avatar: profiles.avatar, avatarUrl: profiles.avatarUrl,
      stockBalance: paperStockBalances.balance,
    }).from(paperPositions).leftJoin(profiles, eq(profiles.userId, paperPositions.userId))
      .leftJoin(paperStockBalances, and(eq(paperStockBalances.userId, paperPositions.userId), eq(paperStockBalances.instrumentId, row.instrumentId)))
      .where(and(eq(paperPositions.thesisId, thesisId), eq(paperPositions.userId, viewerUserId))).limit(1);
    viewerPosition = viewerPositionRow
      ? { ...viewerPositionRow, ...paperPositionMetrics(viewerPositionRow, spotPrice), isViewer: true }
      : null;
  }
  const [viewerBalanceRow] = viewerUserId ? await db.select({ balance: paperStockBalances.balance }).from(paperStockBalances)
    .where(and(eq(paperStockBalances.userId, viewerUserId), eq(paperStockBalances.instrumentId, row.instrumentId))).limit(1) : [];
  const viewerBalance = viewerUserId ? viewerBalanceRow?.balance ?? PAPER_STARTING_STOCK_BALANCE : null;
  return {
    ...row, spotPrice, positions, trades,
    balances: balances.map(({ userId, ...balance }) => ({ ...balance, isViewer: viewerUserId === userId })),
    viewer: viewerUserId ? { stockBalance: viewerBalance, position: viewerPosition } : null,
  };
}

export async function executePublicPaperTrade(thesisId: string, userId: string, direction: PaperDirection, inputAmount: number) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select thesis_id from paper_thesis_markets where thesis_id = ${thesisId}::uuid for update`);
    const [context] = await tx.select({
      instrumentId: theses.instrumentId, baseReserve: paperThesisMarkets.baseReserve,
      quoteReserve: paperThesisMarkets.quoteReserve,
    }).from(theses).innerJoin(paperThesisMarkets, eq(paperThesisMarkets.thesisId, theses.id))
      .where(and(eq(theses.id, thesisId), eq(theses.mode, 'paper'), eq(theses.status, 'published'))).limit(1);
    if (!context) throw new Error('PAPER_MARKET_NOT_FOUND');
    await tx.insert(paperStockBalances).values({ userId, instrumentId: context.instrumentId, balance: PAPER_STARTING_STOCK_BALANCE }).onConflictDoNothing();
    await tx.insert(paperPositions).values({ thesisId, userId }).onConflictDoNothing();
    await tx.execute(sql`select user_id from paper_stock_balances where user_id = ${userId}::uuid and instrument_id = ${context.instrumentId} for update`);
    const [balance] = await tx.select().from(paperStockBalances).where(and(eq(paperStockBalances.userId, userId), eq(paperStockBalances.instrumentId, context.instrumentId))).limit(1);
    const [position] = await tx.select().from(paperPositions).where(and(eq(paperPositions.thesisId, thesisId), eq(paperPositions.userId, userId))).limit(1);
    if (!balance || !position) throw new Error('PAPER_ACCOUNT_UNAVAILABLE');
    const quote = quotePaperTrade(context, direction, inputAmount);
    if (direction === 'buy' && inputAmount > balance.balance + Number.EPSILON) throw new Error('PAPER_STOCK_BALANCE_LOW');
    if (direction === 'sell' && inputAmount > position.quantity + Number.EPSILON) throw new Error('PAPER_POSITION_LOW');
    const now = new Date();
    const nextMarket = direction === 'buy'
      ? { baseReserve: context.baseReserve - quote.outputAmount, quoteReserve: context.quoteReserve + inputAmount }
      : { baseReserve: context.baseReserve + inputAmount, quoteReserve: context.quoteReserve - quote.outputAmount };
    let quantity = position.quantity; let costBasisQuote = position.costBasisQuote; let realizedPnlQuote = position.realizedPnlQuote;
    const nextStockBalance = direction === 'buy' ? balance.balance - inputAmount : balance.balance + quote.outputAmount;
    if (direction === 'buy') { quantity += quote.outputAmount; costBasisQuote += inputAmount; }
    else {
      const allocatedCost = quantity > 0 ? costBasisQuote * (inputAmount / quantity) : 0;
      quantity -= inputAmount; costBasisQuote = Math.max(0, costBasisQuote - allocatedCost);
      realizedPnlQuote += quote.outputAmount - allocatedCost;
      if (quantity < 1e-9) { quantity = 0; costBasisQuote = 0; }
    }
    await tx.update(paperThesisMarkets).set({ ...nextMarket, tradeCount: sql`${paperThesisMarkets.tradeCount} + 1`, updatedAt: now }).where(eq(paperThesisMarkets.thesisId, thesisId));
    await tx.update(paperStockBalances).set({ balance: nextStockBalance, updatedAt: now }).where(and(eq(paperStockBalances.userId, userId), eq(paperStockBalances.instrumentId, context.instrumentId)));
    await tx.update(paperPositions).set({ quantity, costBasisQuote, realizedPnlQuote, updatedAt: now }).where(and(eq(paperPositions.thesisId, thesisId), eq(paperPositions.userId, userId)));
    await tx.insert(paperTrades).values({ thesisId, userId, direction, inputAmount, outputAmount: quote.outputAmount, feeAmount: quote.feeAmount, priceImpactPct: quote.priceImpactPct, executedAt: now });
  });
  return getPublicPaperMarket(thesisId, userId);
}

export async function getPublicMetadata(thesisId: string) {
  const db = getDb();
  const [row] = await db.select({
    id: theses.id, title: theses.title, summary: theses.summary, tokenName: theses.tokenName,
    tokenSymbol: theses.tokenSymbol, status: theses.status, instrumentId: theses.instrumentId,
  }).from(theses).where(and(eq(theses.id, thesisId), inArray(theses.status, ['ready', 'published', 'withdrawn']))).limit(1);
  return row ?? null;
}

export async function recordThesisPreview(input: {
  thesisId: string; userId: string; idempotencyKey: string; intentHash: string;
  wallet: string; messageHash: string; recentBlockhash: string; build: ThesisLaunchBuild;
}) {
  const db = getDb(); const now = new Date();
  return db.transaction(async (tx) => {
    const [thesis] = await tx.select().from(theses)
      .where(and(eq(theses.id, input.thesisId), eq(theses.authorUserId, input.userId), inArray(theses.status, ['draft', 'ready']))).limit(1);
    if (!thesis) throw new Error('THESIS_NOT_EDITABLE');
    const [operation] = await tx.insert(operations).values({
      userId: input.userId, kind: 'thesis_launch', idempotencyKey: input.idempotencyKey,
      intentHash: input.intentHash, status: 'quoted', providerRef: input.build.poolAddress,
    }).onConflictDoNothing().returning({ id: operations.id });
    if (!operation) throw new Error('DUPLICATE_THESIS_INTENT');
    const values = {
      operationId: operation.id, chainNamespace: 'solana:mainnet', creatorWallet: input.wallet,
      quoteMint: input.build.quoteMint, quoteDecimals: input.build.instrument.decimals,
      baseMint: input.build.baseMint, tokenBadge: input.build.tokenBadge,
      configAddress: input.build.configAddress, poolAddress: input.build.poolAddress,
      configVersion: input.build.terms.version, terms: input.build.terms,
      transactionMessageHash: input.messageHash, recentBlockhash: input.recentBlockhash,
      lastValidBlockHeight: input.build.lastValidBlockHeight, status: 'preview', updatedAt: now,
    };
    const [market] = await tx.insert(thesisMarkets).values({ thesisId: input.thesisId, ...values })
      .onConflictDoUpdate({ target: thesisMarkets.thesisId, set: values }).returning();
    await tx.update(theses).set({ status: 'ready', updatedAt: now }).where(eq(theses.id, input.thesisId));
    return { operationId: operation.id, market };
  });
}

export async function getThesisSubmission(thesisId: string, userId: string) {
  const db = getDb();
  const [row] = await db.select({ thesis: theses, market: thesisMarkets, operation: operations })
    .from(theses).innerJoin(thesisMarkets, eq(thesisMarkets.thesisId, theses.id))
    .innerJoin(operations, eq(operations.id, thesisMarkets.operationId))
    .where(and(eq(theses.id, thesisId), eq(theses.authorUserId, userId))).limit(1);
  return row ?? null;
}

export type ThesisSubmitClaim = 'claimed' | 'busy' | 'limit';
export async function claimThesisSubmission(thesisId: string, userId: string): Promise<ThesisSubmitClaim> {
  const db = getDb(); const now = new Date();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 1))`);
    const [recent] = await tx.select({ value: count() }).from(thesisMarkets)
      .innerJoin(theses, eq(theses.id, thesisMarkets.thesisId))
      .where(and(eq(theses.authorUserId, userId), inArray(thesisMarkets.status, ['submitting', 'submitted', 'active', 'unknown']), sql`${thesisMarkets.updatedAt} > now() - interval '24 hours'`));
    if (Number(recent?.value ?? 0) >= 1) return 'limit';
    const claimed = await tx.update(thesisMarkets).set({ status: 'submitting', updatedAt: now })
      .where(and(eq(thesisMarkets.thesisId, thesisId), eq(thesisMarkets.status, 'preview'))).returning({ id: thesisMarkets.id, operationId: thesisMarkets.operationId });
    if (!claimed.length) return 'busy';
    if (claimed[0].operationId) await tx.update(operations).set({ status: 'submitted', updatedAt: now }).where(eq(operations.id, claimed[0].operationId));
    return 'claimed';
  });
}

export async function setThesisSubmissionStatus(input: { thesisId: string; userId: string; status: 'submitted' | 'active' | 'failed' | 'unknown'; signature?: string; errorClass?: string }) {
  const db = getDb(); const now = new Date();
  await db.transaction(async (tx) => {
    const [market] = await tx.select({ id: thesisMarkets.id, operationId: thesisMarkets.operationId })
      .from(thesisMarkets).innerJoin(theses, eq(theses.id, thesisMarkets.thesisId))
      .where(and(eq(thesisMarkets.thesisId, input.thesisId), eq(theses.authorUserId, input.userId))).limit(1);
    if (!market) return;
    await tx.update(thesisMarkets).set({ status: input.status, txSignature: input.signature, updatedAt: now }).where(eq(thesisMarkets.id, market.id));
    if (market.operationId) await tx.update(operations).set({ status: input.status === 'active' ? 'confirmed' : input.status, txHash: input.signature, errorClass: input.errorClass, updatedAt: now }).where(eq(operations.id, market.operationId));
    if (input.status === 'active') await tx.update(theses).set({ status: 'published', publishedAt: now, updatedAt: now }).where(eq(theses.id, input.thesisId));
    if (input.status === 'failed') await tx.update(theses).set({ status: 'draft', updatedAt: now }).where(eq(theses.id, input.thesisId));
  });
}

export async function recordThesisTradePreview(input: {
  thesisMarketId: string; userId: string; idempotencyKey: string; intentHash: string; walletAddress: string;
  direction: 'buy' | 'sell'; inputMint: string; outputMint: string; inputAmountRaw: string;
  expectedOutputRaw: string; minimumOutputRaw: string; slippageBps: number; messageHash: string;
  recentBlockhash: string; lastValidBlockHeight: number; expiresAt: Date;
}) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [operation] = await tx.insert(operations).values({
      userId: input.userId, kind: `thesis_${input.direction}`, idempotencyKey: input.idempotencyKey,
      intentHash: input.intentHash, status: 'quoted', providerRef: input.thesisMarketId,
    }).onConflictDoNothing().returning({ id: operations.id });
    if (!operation) throw new Error('DUPLICATE_TRADE_INTENT');
    const [quote] = await tx.insert(thesisTradeQuotes).values({
      thesisMarketId: input.thesisMarketId, operationId: operation.id, userId: input.userId,
      walletAddress: input.walletAddress, direction: input.direction, inputMint: input.inputMint,
      outputMint: input.outputMint, inputAmountRaw: input.inputAmountRaw,
      expectedOutputRaw: input.expectedOutputRaw, minimumOutputRaw: input.minimumOutputRaw,
      slippageBps: input.slippageBps, transactionMessageHash: input.messageHash,
      recentBlockhash: input.recentBlockhash, lastValidBlockHeight: input.lastValidBlockHeight,
      expiresAt: input.expiresAt,
    }).returning();
    return quote;
  });
}

export async function getThesisTradeOperation(thesisId: string, quoteId: string, userId: string) {
  const db = getDb();
  const [row] = await db.select({ quote: thesisTradeQuotes, market: thesisMarkets, thesis: theses, operation: operations })
    .from(thesisTradeQuotes)
    .innerJoin(thesisMarkets, eq(thesisMarkets.id, thesisTradeQuotes.thesisMarketId))
    .innerJoin(theses, eq(theses.id, thesisMarkets.thesisId))
    .innerJoin(operations, eq(operations.id, thesisTradeQuotes.operationId))
    .where(and(eq(theses.id, thesisId), eq(thesisTradeQuotes.id, quoteId), eq(thesisTradeQuotes.userId, userId))).limit(1);
  return row ?? null;
}

export async function claimThesisTrade(quoteId: string, userId: string): Promise<'claimed' | 'busy' | 'expired'> {
  const db = getDb(); const now = new Date();
  return db.transaction(async (tx) => {
    const [quote] = await tx.select({ expiresAt: thesisTradeQuotes.expiresAt, operationId: thesisTradeQuotes.operationId, status: thesisTradeQuotes.status })
      .from(thesisTradeQuotes).where(and(eq(thesisTradeQuotes.id, quoteId), eq(thesisTradeQuotes.userId, userId))).limit(1);
    if (!quote || quote.status !== 'quoted') return 'busy';
    if (quote.expiresAt <= now) {
      await tx.update(thesisTradeQuotes).set({ status: 'expired', updatedAt: now }).where(eq(thesisTradeQuotes.id, quoteId));
      await tx.update(operations).set({ status: 'expired', updatedAt: now }).where(eq(operations.id, quote.operationId));
      return 'expired';
    }
    const [claimed] = await tx.update(thesisTradeQuotes).set({ status: 'submitting', updatedAt: now })
      .where(and(eq(thesisTradeQuotes.id, quoteId), eq(thesisTradeQuotes.status, 'quoted'))).returning({ operationId: thesisTradeQuotes.operationId });
    if (!claimed) return 'busy';
    await tx.update(operations).set({ status: 'submitted', updatedAt: now }).where(eq(operations.id, claimed.operationId));
    return 'claimed';
  });
}

export async function setThesisTradeStatus(input: { quoteId: string; userId: string; status: 'submitted' | 'confirmed' | 'failed' | 'unknown'; signature?: string; errorClass?: string }) {
  const db = getDb(); const now = new Date();
  await db.transaction(async (tx) => {
    const [quote] = await tx.update(thesisTradeQuotes).set({ status: input.status, txSignature: input.signature, updatedAt: now })
      .where(and(eq(thesisTradeQuotes.id, input.quoteId), eq(thesisTradeQuotes.userId, input.userId)))
      .returning({ operationId: thesisTradeQuotes.operationId });
    if (quote) await tx.update(operations).set({
      status: input.status, txHash: input.signature, errorClass: input.errorClass, updatedAt: now,
    }).where(eq(operations.id, quote.operationId));
  });
}
