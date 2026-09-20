import { index, pgTable, uuid, text, date, integer, boolean, timestamp, uniqueIndex, primaryKey, jsonb, numeric, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// One internal user per verified Privy identity. We key on the Privy DID, never
// on email or wallet address (those can change or be shared).
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  privyDid: text('privy_did').notNull().unique(),
  paperPublicId: text('paper_public_id').notNull().default(sql`encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')`).unique(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
});

// Editable profile. `version` powers optimistic-concurrency checks so a stale
// edit from one device can't silently overwrite a newer one from another.
export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  handle: text('handle').unique(),
  displayName: text('display_name').notNull().default('Early bird'),
  avatar: integer('avatar').notNull().default(0),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  visibility: text('visibility').notNull().default('private'),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// One bounded, re-encoded photo per user. Social APIs return only the stable
// route stored on the profile, so member and comment payloads stay small.
export const profilePhotos = pgTable('profile_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contentType: text('content_type').notNull().default('image/webp'),
  data: text('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqUser: uniqueIndex('profile_photos_user').on(t.userId) }));

// One row per saved company — individual records, so a save on one device never
// rewrites the whole set and clobbers another device's change.
export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: text('company_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqCompany: uniqueIndex('bookmarks_user_company').on(t.userId, t.companyId) }));

// Broader-interest communities. Seeded from the app's canonical circle list.
export const circles = pgTable('circles', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  creatorUserId: uuid('creator_user_id').references(() => users.id, { onDelete: 'set null' }),
  kind: text('kind').notNull().default('interest'), // interest | stock | custom
  gateMode: text('gate_mode').notNull().default('open'), // open | any_stock | all_stocks
  tickers: jsonb('tickers').$type<string[]>().notNull().default([]),
  visibility: text('visibility').notNull().default('public'),
  status: text('status').notNull().default('active'),
  pinnedUntil: timestamp('pinned_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// One row per paid circle pin. tx_hash is UNIQUE so a single DAYC payment can
// never be replayed to pin more than once.
export const circlePins = pgTable('circle_pins', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  txHash: text('tx_hash').notNull().unique(),
  amountRaw: text('amount_raw').notNull(),
  pinnedUntil: timestamp('pinned_until', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ circleLookup: index('circle_pins_circle_idx').on(t.circleId) }));

// Prepaid, non-transferable service credits. Cents are integer accounting units.
export const economyAccounts = pgTable('economy_accounts', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  balanceCents: integer('balance_cents').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const economyQuotes = pgTable('economy_quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  wallet: text('wallet').notNull(),
  creditsCents: integer('credits_cents').notNull(),
  amountRaw: numeric('amount_raw', { precision: 38, scale: 0 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const economyPayments = pgTable('economy_payments', {
  txHash: text('tx_hash').primaryKey(),
  quoteId: uuid('quote_id').notNull().unique().references(() => economyQuotes.id),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().default('USDC'),
  amountRaw: numeric('amount_raw', { precision: 38, scale: 0 }).notNull(),
  creditsCents: integer('credits_cents').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const economyEntries = pgTable('economy_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deltaCents: integer('delta_cents').notNull(),
  kind: text('kind').notNull(),
  reference: text('reference').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqueRef: uniqueIndex('economy_entries_kind_reference_idx').on(t.kind, t.reference), userLookup: index('economy_entries_user_idx').on(t.userId, t.createdAt) }));
export const economyServiceOrders = pgTable('economy_service_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  idempotencyKey: text('idempotency_key').notNull(),
  service: text('service').notNull(),
  target: text('target').notNull(),
  costCents: integer('cost_cents').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqueKey: uniqueIndex('economy_service_orders_user_key_idx').on(t.userId, t.idempotencyKey) }));
export const economyResearchSettings = pgTable('economy_research_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  dailySpendCapCents: integer('daily_spend_cap_cents').notNull().default(100),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export const economyResearchJobs = pgTable('economy_research_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  idempotencyKey: text('idempotency_key').notNull(),
  symbol: text('symbol').notNull(),
  costCents: integer('cost_cents').notNull(),
  memberDiscountCents: integer('member_discount_cents').notNull().default(0),
  status: text('status').notNull().default('pending'),
  result: jsonb('result'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqueKey: uniqueIndex('economy_research_jobs_user_key_idx').on(t.userId, t.idempotencyKey), userTime: index('economy_research_jobs_user_time_idx').on(t.userId, t.createdAt) }));
export const economyRefundRequests = pgTable('economy_refund_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  paymentTxHash: text('payment_tx_hash').notNull().references(() => economyPayments.txHash),
  wallet: text('wallet').notNull(),
  amountCents: integer('amount_cents').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'),
  refundTxHash: text('refund_tx_hash'),
  reviewerUserId: uuid('reviewer_user_id').references(() => users.id),
  resolutionNote: text('resolution_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (t) => ({ userTime: index('economy_refunds_user_time_idx').on(t.userId, t.createdAt) }));
export const economyChallenges = pgTable('economy_challenges', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id').notNull().references(() => circles.id),
  sponsorUserId: uuid('sponsor_user_id').notNull().references(() => users.id),
  idempotencyKey: text('idempotency_key').notNull(),
  title: text('title').notNull(),
  brief: text('brief').notNull(),
  criteria: text('criteria').notNull(),
  budgetCents: integer('budget_cents').notNull(),
  status: text('status').notNull().default('open'),
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqueSponsorKey: uniqueIndex('economy_challenges_sponsor_key_idx').on(t.sponsorUserId, t.idempotencyKey) }));
export const economySubmissions = pgTable('economy_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  challengeId: uuid('challenge_id').notNull().references(() => economyChallenges.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workUrl: text('work_url').notNull(),
  summary: text('summary').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqueSubmission: uniqueIndex('economy_submissions_challenge_user_idx').on(t.challengeId, t.userId) }));
export const economyAwards = pgTable('economy_awards', {
  challengeId: uuid('challenge_id').primaryKey().references(() => economyChallenges.id, { onDelete: 'cascade' }),
  submissionId: uuid('submission_id').notNull().unique().references(() => economySubmissions.id),
  recipientUserId: uuid('recipient_user_id').notNull().references(() => users.id),
  creditsCents: integer('credits_cents').notNull(),
  awardedAt: timestamp('awarded_at', { withTimezone: true }).notNull().defaultNow(),
});
export const economyDisputes = pgTable('economy_disputes', {
  challengeId: uuid('challenge_id').primaryKey().references(() => economyChallenges.id, { onDelete: 'cascade' }),
  filedByUserId: uuid('filed_by_user_id').notNull().references(() => users.id),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('open'),
  reviewerUserId: uuid('reviewer_user_id').references(() => users.id),
  resolutionNote: text('resolution_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

// A short-lived proof that a verified, user-owned wallet held a supported stock.
// Quantities are deliberately not stored: circles only need a yes/no eligibility
// fact, and members never receive another member's wallet address.
export const holdingEligibilities = pgTable('holding_eligibilities', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ticker: text('ticker').notNull(),
  walletAddress: text('wallet_address').notNull(),
  tokenAddress: text('token_address').notNull(),
  chainNamespace: text('chain_namespace').notNull().default('eip155:8453'),
  chainId: integer('chain_id').notNull().default(8453),
  blockNumber: text('block_number').notNull(),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.ticker, t.walletAddress, t.chainNamespace] }),
  expiryLookup: index('holding_eligibilities_expiry_idx').on(t.userId, t.expiresAt),
}));

export const circleMemberships = pgTable('circle_memberships', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  status: text('status').notNull().default('active'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqMember: uniqueIndex('circle_memberships_circle_user').on(t.circleId, t.userId),
  userLookup: index('circle_memberships_user_idx').on(t.userId),
}));

// Records that a device's local profile was imported, so it happens once.
export const migrationImports = pgTable('migration_imports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqImport: uniqueIndex('migration_imports_user_version').on(t.userId, t.version) }));

// ---- Foundation for the next milestone (defined now, not yet wired) ----

export const savedDiscoveries = pgTable('saved_discoveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').notNull(),
  sourceType: text('source_type').notNull(),
  savedAt: timestamp('saved_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqSaved: uniqueIndex('saved_discoveries_user_source').on(t.userId, t.sourceType, t.sourceId) }));

export const linkedWallets = pgTable('linked_wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  address: text('address').notNull(),
  namespace: text('namespace').notNull().default('eip155'),
  visibility: text('visibility').notNull().default('private'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqWallet: uniqueIndex('linked_wallets_namespace_address').on(t.namespace, t.address),
  userLookup: index('linked_wallets_user_idx').on(t.userId),
}));

export const watchlists = pgTable('watchlists', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  visibility: text('visibility').notNull().default('private'),
  circleId: uuid('circle_id').references(() => circles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ownerLookup: index('watchlists_owner_user_idx').on(t.ownerUserId),
  circleLookup: index('watchlists_circle_idx').on(t.circleId),
}));

export const watchlistItems = pgTable('watchlist_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  watchlistId: uuid('watchlist_id').notNull().references(() => watchlists.id, { onDelete: 'cascade' }),
  companyId: text('company_id').notNull(),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqItem: uniqueIndex('watchlist_items_list_company').on(t.watchlistId, t.companyId) }));

// ---- Social: shared discoveries inside circles, saves, and moderation ----

// A member shares an asset (stock or memestock) into a circle with a short note.
// Visible to that circle's members; authorship is a Daybreak identity, not a wallet.
export const circleDiscoveries = pgTable('circle_discoveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  circleSlug: text('circle_slug').notNull(),
  subjectType: text('subject_type').notNull(), // 'stock' | 'memestock'
  subjectId: text('subject_id').notNull(),     // ticker, or token address for a memestock
  subjectLabel: text('subject_label'),
  note: text('note'),
  status: text('status').notNull().default('active'), // active | removed
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  circleLookup: index('circle_discoveries_circle_idx').on(t.circleSlug),
  authorLookup: index('circle_discoveries_user_idx').on(t.userId),
}));

// One member saving another member's shared discovery into their own collection.
export const discoverySaves = pgTable('discovery_saves', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  discoveryId: uuid('discovery_id').notNull().references(() => circleDiscoveries.id, { onDelete: 'cascade' }),
  savedAt: timestamp('saved_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqSave: uniqueIndex('discovery_saves_user_discovery').on(t.userId, t.discoveryId) }));

// Personal block: the blocker never sees the blocked user's shared content.
export const userBlocks = pgTable('user_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  blockerUserId: uuid('blocker_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedUserId: uuid('blocked_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqBlock: uniqueIndex('user_blocks_blocker_blocked').on(t.blockerUserId, t.blockedUserId) }));

// A report for moderation review. One per (reporter, discovery).
export const contentReports = pgTable('content_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  reporterUserId: uuid('reporter_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  discoveryId: uuid('discovery_id').notNull().references(() => circleDiscoveries.id, { onDelete: 'cascade' }),
  reason: text('reason'),
  status: text('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqReport: uniqueIndex('content_reports_reporter_discovery').on(t.reporterUserId, t.discoveryId) }));

// Discussion attached to one canonical news URL inside a stock workspace.
// articleKey is a server-computed SHA-256 hash; URLs remain available for
// attribution while comments are authored by Daybreak identities.
export const newsComments = pgTable('news_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  articleKey: text('article_key').notNull(),
  articleUrl: text('article_url').notNull(),
  ticker: text('ticker').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  articleLookup: index('news_comments_article_idx').on(t.articleKey, t.createdAt),
  authorLookup: index('news_comments_user_idx').on(t.userId),
}));

// ---- Bankr integration: durable operation ledger + market state (Phase B) ----
// Financial amounts are raw integer strings with explicit decimals — never floats.

export const walletConnections = pgTable('wallet_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // e.g. 'bankr'
  chain: text('chain').notNull().default('base'),
  address: text('address').notNull(),
  providerWalletRef: text('provider_wallet_ref'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqBinding: uniqueIndex('wallet_connections_provider_chain_address').on(t.provider, t.chain, t.address),
  userLookup: index('wallet_connections_user_idx').on(t.userId),
}));

// One row per user action. idempotencyKey is unique per user and binds to an
// immutable intentHash so a retry can never double-broadcast.
export const operations = pgTable('operations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // 'swap' | 'launch'
  idempotencyKey: text('idempotency_key').notNull(),
  intentHash: text('intent_hash').notNull(),
  status: text('status').notNull().default('draft'), // draft|quoted|awaiting_confirmation|submitted|confirmed|failed|unknown
  providerRef: text('provider_ref'),
  txHash: text('tx_hash'),
  errorClass: text('error_class'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqIdem: uniqueIndex('operations_user_idempotency').on(t.userId, t.idempotencyKey) }));

export const communityTokens = pgTable('community_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  chain: text('chain').notNull().default('base'),
  address: text('address').notNull(),
  stockAddress: text('stock_address'),
  companyId: text('company_id'),
  circleId: uuid('circle_id').references(() => circles.id, { onDelete: 'set null' }),
  source: text('source'),
  verificationStatus: text('verification_status').notNull().default('unverified'), // verified|unverified_reference|unavailable|stale|provider_error
  observedAt: timestamp('observed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqToken: uniqueIndex('community_tokens_chain_address').on(t.chain, t.address),
  circleLookup: index('community_tokens_circle_idx').on(t.circleId),
  companyLookup: index('community_tokens_company_idx').on(t.companyId),
}));

export const tokenPools = pgTable('token_pools', {
  id: uuid('id').defaultRandom().primaryKey(),
  chain: text('chain').notNull().default('base'),
  protocol: text('protocol').notNull(),
  poolRef: text('pool_ref').notNull(),
  token0: text('token0').notNull(),
  token1: text('token1').notNull(),
  liquidityUsd: text('liquidity_usd'),
  observedAt: timestamp('observed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqPool: uniqueIndex('token_pools_chain_protocol_ref').on(t.chain, t.protocol, t.poolRef),
  token0Lookup: index('token_pools_token0_idx').on(t.token0),
  token1Lookup: index('token_pools_token1_idx').on(t.token1),
}));

export const tradeQuotes = pgTable('trade_quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  walletAddress: text('wallet_address').notNull(),
  sellToken: text('sell_token').notNull(),
  buyToken: text('buy_token').notNull(),
  sellAmountRaw: text('sell_amount_raw').notNull(),
  buyAmountRaw: text('buy_amount_raw').notNull(),
  sellDecimals: integer('sell_decimals').notNull(),
  buyDecimals: integer('buy_decimals').notNull(),
  minBuyAmountRaw: text('min_buy_amount_raw').notNull(),
  feeBps: integer('fee_bps'),
  providerRef: text('provider_ref'), // quoteId
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tokenLaunches = pgTable('token_launches', {
  id: uuid('id').defaultRandom().primaryKey(),
  operationId: uuid('operation_id').references(() => operations.id, { onDelete: 'set null' }),
  creatorUserId: uuid('creator_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  circleId: uuid('circle_id').references(() => circles.id, { onDelete: 'set null' }),
  quoteAsset: text('quote_asset'),
  supply: text('supply'),
  allocation: text('allocation'),
  feeRecipient: text('fee_recipient'),
  simulationFingerprint: text('simulation_fingerprint'),
  tokenAddress: text('token_address'),
  poolRef: text('pool_ref'),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  operationLookup: index('token_launches_operation_idx').on(t.operationId),
  creatorLookup: index('token_launches_creator_idx').on(t.creatorUserId),
  circleLookup: index('token_launches_circle_idx').on(t.circleId),
}));

// A market actor owns public thesis-market state. Human actors link to one
// Daybreak account; agent actors link to an operator-owned agent record.
export const marketActors = pgTable('market_actors', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicId: text('public_id').notNull().default(sql`encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')`).unique(),
  kind: text('kind').notNull(), // human | agent
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ kindLookup: index('market_actors_kind_idx').on(t.kind, t.createdAt) }));

export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').notNull().references(() => marketActors.id, { onDelete: 'cascade' }).unique(),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  strategy: text('strategy').notNull(),
  avatar: integer('avatar').notNull().default(0),
  status: text('status').notNull().default('active'), // active | paused | revoked
  policyVersion: integer('policy_version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ ownerLookup: index('agents_owner_idx').on(t.ownerUserId, t.createdAt) }));

export const agentApiKeys = pgTable('agent_api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  prefix: text('prefix').notNull().unique(),
  secretDigest: text('secret_digest').notNull().unique(),
  scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ agentLookup: index('agent_api_keys_agent_idx').on(t.agentId, t.createdAt) }));

export const agentPolicies = pgTable('agent_policies', {
  agentId: uuid('agent_id').primaryKey().references(() => agents.id, { onDelete: 'cascade' }),
  allowedInstrumentIds: jsonb('allowed_instrument_ids').$type<string[]>().notNull().default([]),
  canPublish: boolean('can_publish').notNull().default(true),
  maxInputPerTrade: numeric('max_input_per_trade', { precision: 30, scale: 10, mode: 'number' }).notNull().default(5),
  dailyGrossBuy: numeric('daily_gross_buy', { precision: 30, scale: 10, mode: 'number' }).notNull().default(25),
  maxSlippageBps: integer('max_slippage_bps').notNull().default(300),
  dailyPublicationLimit: integer('daily_publication_limit').notNull().default(3),
  liveFlashEnabled: boolean('live_flash_enabled').notNull().default(false),
  liveFlashWallet: text('live_flash_wallet'),
  liveFlashMaxUsdcPerOrder: numeric('live_flash_max_usdc_per_order', { precision: 18, scale: 6, mode: 'number' }).notNull().default(5),
  liveFlashDailyUsdc: numeric('live_flash_daily_usdc', { precision: 18, scale: 6, mode: 'number' }).notNull().default(25),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const agentFlashOrders = pgTable('agent_flash_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').notNull().references(() => marketActors.id, { onDelete: 'cascade' }),
  thesisId: uuid('thesis_id').notNull().references(() => theses.id),
  instrumentId: text('instrument_id').notNull(),
  wallet: text('wallet').notNull(),
  quoteId: text('quote_id').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  requestHash: text('request_hash').notNull(),
  amountUsdc: numeric('amount_usdc', { precision: 18, scale: 6, mode: 'number' }).notNull(),
  status: text('status').notNull().default('pending'),
  flashOrderId: text('flash_order_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ idempotency: uniqueIndex('agent_flash_orders_actor_key_idx').on(t.actorId, t.idempotencyKey), quote: uniqueIndex('agent_flash_orders_actor_quote_idx').on(t.actorId, t.quoteId), daily: index('agent_flash_orders_actor_created_idx').on(t.actorId, t.createdAt) }));

export const agentBudgetWindows = pgTable('agent_budget_windows', {
  actorId: uuid('actor_id').notNull().references(() => marketActors.id, { onDelete: 'cascade' }),
  instrumentId: text('instrument_id').notNull(),
  windowStart: date('window_start').notNull(),
  grossBuy: numeric('gross_buy', { precision: 30, scale: 10, mode: 'number' }).notNull().default(0),
  tradeCount: integer('trade_count').notNull().default(0),
  publicationCount: integer('publication_count').notNull().default(0),
}, (t) => ({ pk: primaryKey({ columns: [t.actorId, t.instrumentId, t.windowStart] }), expiryLookup: index('agent_budget_windows_date_idx').on(t.windowStart) }));

export const agentQuotes = pgTable('agent_quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').notNull().references(() => marketActors.id, { onDelete: 'cascade' }),
  thesisId: uuid('thesis_id').notNull(),
  instrumentId: text('instrument_id').notNull(),
  direction: text('direction').notNull(),
  inputAmount: numeric('input_amount', { precision: 30, scale: 10, mode: 'number' }).notNull(),
  expectedOutput: numeric('expected_output', { precision: 30, scale: 10, mode: 'number' }).notNull(),
  minimumOutput: numeric('minimum_output', { precision: 30, scale: 10, mode: 'number' }).notNull(),
  feeAmount: numeric('fee_amount', { precision: 30, scale: 10, mode: 'number' }).notNull(),
  priceImpactPct: numeric('price_impact_pct', { precision: 20, scale: 10, mode: 'number' }).notNull(),
  slippageBps: integer('slippage_bps').notNull(),
  policyVersion: integer('policy_version').notNull(),
  status: text('status').notNull().default('quoted'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ actorLookup: index('agent_quotes_actor_idx').on(t.actorId, t.createdAt), thesisLookup: index('agent_quotes_thesis_idx').on(t.thesisId, t.createdAt) }));

export const agentRequests = pgTable('agent_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').notNull().references(() => marketActors.id, { onDelete: 'cascade' }),
  operation: text('operation').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  requestHash: text('request_hash').notNull(),
  state: text('state').notNull().default('pending'),
  resourceId: uuid('resource_id'),
  response: jsonb('response').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqueRequest: uniqueIndex('agent_requests_actor_operation_key_idx').on(t.actorId, t.operation, t.idempotencyKey), actorLookup: index('agent_requests_actor_idx').on(t.actorId, t.createdAt) }));

export const agentAuditEvents = pgTable('agent_audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').notNull().references(() => marketActors.id, { onDelete: 'cascade' }),
  keyPrefix: text('key_prefix'),
  operation: text('operation').notNull(),
  resultCode: text('result_code').notNull(),
  requestId: text('request_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ actorLookup: index('agent_audit_events_actor_idx').on(t.actorId, t.createdAt) }));

// A thesis is editorial content first. Its published argument and market identity
// become immutable together; authors add updates instead of rewriting history.
export const theses = pgTable('theses', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'cascade' }),
  authorActorId: uuid('author_actor_id').notNull().references(() => marketActors.id, { onDelete: 'cascade' }),
  instrumentId: text('instrument_id').notNull(),
  companyId: text('company_id').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  body: text('body').notNull(),
  invalidation: text('invalidation').notNull(),
  horizon: text('horizon'),
  sources: jsonb('sources').$type<string[]>().notNull().default([]),
  tokenName: text('token_name').notNull(),
  tokenSymbol: text('token_symbol').notNull(),
  creationIntentId: uuid('creation_intent_id'),
  creationIntentHash: text('creation_intent_hash'),
  mode: text('mode').notNull().default('live'), // live | paper
  status: text('status').notNull().default('draft'), // draft|ready|published|withdrawn
  visibility: text('visibility').notNull().default('public'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  authorLookup: index('theses_author_idx').on(t.authorUserId),
  actorLookup: index('theses_author_actor_idx').on(t.authorActorId),
  companyLookup: index('theses_company_idx').on(t.companyId),
  statusLookup: index('theses_status_idx').on(t.status, t.publishedAt),
  paperCreationIntent: uniqueIndex('theses_paper_creation_intent_idx').on(t.authorActorId, t.creationIntentId),
}));

export const thesisMarkets = pgTable('thesis_markets', {
  id: uuid('id').defaultRandom().primaryKey(),
  thesisId: uuid('thesis_id').notNull().references(() => theses.id, { onDelete: 'cascade' }),
  operationId: uuid('operation_id').references(() => operations.id, { onDelete: 'set null' }),
  chainNamespace: text('chain_namespace').notNull().default('solana:mainnet'),
  creatorWallet: text('creator_wallet').notNull(),
  quoteMint: text('quote_mint').notNull(),
  quoteDecimals: integer('quote_decimals').notNull(),
  baseMint: text('base_mint').notNull(),
  tokenBadge: text('token_badge').notNull(),
  configAddress: text('config_address').notNull(),
  poolAddress: text('pool_address').notNull(),
  configVersion: text('config_version').notNull(),
  terms: jsonb('terms').$type<Record<string, unknown>>().notNull(),
  transactionMessageHash: text('transaction_message_hash').notNull(),
  recentBlockhash: text('recent_blockhash').notNull(),
  lastValidBlockHeight: integer('last_valid_block_height').notNull(),
  txSignature: text('tx_signature'),
  status: text('status').notNull().default('preview'), // preview|submitting|submitted|active|failed|unknown|migrated
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqThesis: uniqueIndex('thesis_markets_thesis_idx').on(t.thesisId),
  uniqPool: uniqueIndex('thesis_markets_pool_idx').on(t.chainNamespace, t.poolAddress),
  operationLookup: index('thesis_markets_operation_idx').on(t.operationId),
  statusLookup: index('thesis_markets_status_idx').on(t.status, t.updatedAt),
}));

// Paper markets are public shared simulations. One locked market row serializes
// curve updates; balances, positions, trades and P/L are public social signals.
export const paperThesisMarkets = pgTable('paper_thesis_markets', {
  thesisId: uuid('thesis_id').primaryKey().references(() => theses.id, { onDelete: 'cascade' }),
  baseReserve: numeric('base_reserve', { precision: 30, scale: 10, mode: 'number' }).notNull(),
  quoteReserve: numeric('quote_reserve', { precision: 30, scale: 10, mode: 'number' }).notNull(),
  tradeCount: integer('trade_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const paperStockBalances = pgTable('paper_stock_balances', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').notNull().references(() => marketActors.id, { onDelete: 'cascade' }),
  publicId: text('public_id').notNull(),
  instrumentId: text('instrument_id').notNull(),
  balance: numeric('balance', { precision: 30, scale: 10, mode: 'number' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.actorId, t.instrumentId] }), publicLookup: index('paper_stock_balances_instrument_public_idx').on(t.instrumentId, t.publicId) }));

export const paperPositions = pgTable('paper_positions', {
  thesisId: uuid('thesis_id').notNull().references(() => theses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').notNull().references(() => marketActors.id, { onDelete: 'cascade' }),
  publicId: text('public_id').notNull(),
  quantity: numeric('quantity', { precision: 30, scale: 10, mode: 'number' }).notNull().default(0),
  costBasisQuote: numeric('cost_basis_quote', { precision: 30, scale: 10, mode: 'number' }).notNull().default(0),
  realizedPnlQuote: numeric('realized_pnl_quote', { precision: 30, scale: 10, mode: 'number' }).notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.thesisId, t.actorId] }), thesisLookup: index('paper_positions_thesis_idx').on(t.thesisId, t.updatedAt), publicLookup: index('paper_positions_thesis_public_idx').on(t.thesisId, t.publicId) }));

export const paperTrades = pgTable('paper_trades', {
  id: uuid('id').defaultRandom().primaryKey(),
  thesisId: uuid('thesis_id').notNull().references(() => theses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').notNull().references(() => marketActors.id, { onDelete: 'cascade' }),
  intentId: uuid('intent_id'),
  intentHash: text('intent_hash'),
  direction: text('direction').notNull(),
  inputAmount: numeric('input_amount', { precision: 30, scale: 10, mode: 'number' }).notNull(),
  outputAmount: numeric('output_amount', { precision: 30, scale: 10, mode: 'number' }).notNull(),
  feeAmount: numeric('fee_amount', { precision: 30, scale: 10, mode: 'number' }).notNull(),
  priceImpactPct: numeric('price_impact_pct', { precision: 20, scale: 10, mode: 'number' }).notNull(),
  rationale: text('rationale'),
  executedAt: timestamp('executed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  intentUnique: uniqueIndex('paper_trades_intent_idx').on(t.actorId, t.intentId),
  thesisLookup: index('paper_trades_thesis_idx').on(t.thesisId, t.executedAt),
  userLookup: index('paper_trades_user_idx').on(t.userId, t.executedAt),
  positiveAmounts: check('paper_trades_positive_amounts', sql`${t.inputAmount} > 0 AND ${t.outputAmount} > 0 AND ${t.feeAmount} > 0`),
}));

export const paperActivityLimits = pgTable('paper_activity_limits', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').notNull().references(() => marketActors.id, { onDelete: 'cascade' }),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  count: integer('count').notNull().default(0),
}, (t) => ({ pk: primaryKey({ columns: [t.actorId, t.windowStart] }), expiryLookup: index('paper_activity_limits_window_idx').on(t.windowStart) }));

export const thesisUpdates = pgTable('thesis_updates', {
  id: uuid('id').defaultRandom().primaryKey(),
  thesisId: uuid('thesis_id').notNull().references(() => theses.id, { onDelete: 'cascade' }),
  authorUserId: uuid('author_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  sources: jsonb('sources').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ thesisLookup: index('thesis_updates_thesis_idx').on(t.thesisId, t.createdAt) }));

export const thesisFollows = pgTable('thesis_follows', {
  thesisId: uuid('thesis_id').notNull().references(() => theses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.thesisId, t.userId] }) }));

export const thesisComments = pgTable('thesis_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  thesisId: uuid('thesis_id').notNull().references(() => theses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ thesisLookup: index('thesis_comments_thesis_idx').on(t.thesisId, t.createdAt) }));

// One immutable wallet review per thesis-market trade. The stored transaction
// message binds the displayed pair, direction, input and slippage floor to the
// transaction Daybreak will accept for broadcast.
export const thesisTradeQuotes = pgTable('thesis_trade_quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  thesisMarketId: uuid('thesis_market_id').notNull().references(() => thesisMarkets.id, { onDelete: 'cascade' }),
  operationId: uuid('operation_id').notNull().references(() => operations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  walletAddress: text('wallet_address').notNull(),
  direction: text('direction').notNull(), // buy | sell
  inputMint: text('input_mint').notNull(),
  outputMint: text('output_mint').notNull(),
  inputAmountRaw: text('input_amount_raw').notNull(),
  expectedOutputRaw: text('expected_output_raw').notNull(),
  minimumOutputRaw: text('minimum_output_raw').notNull(),
  slippageBps: integer('slippage_bps').notNull(),
  transactionMessageHash: text('transaction_message_hash').notNull(),
  recentBlockhash: text('recent_blockhash').notNull(),
  lastValidBlockHeight: integer('last_valid_block_height').notNull(),
  status: text('status').notNull().default('quoted'), // quoted|submitting|submitted|confirmed|failed|unknown|expired
  txSignature: text('tx_signature'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqOperation: uniqueIndex('thesis_trade_quotes_operation_idx').on(t.operationId),
  marketLookup: index('thesis_trade_quotes_market_idx').on(t.thesisMarketId, t.createdAt),
  userLookup: index('thesis_trade_quotes_user_idx').on(t.userId, t.createdAt),
  statusLookup: index('thesis_trade_quotes_status_idx').on(t.status, t.expiresAt),
}));

export const feeObservations = pgTable('fee_observations', {
  id: uuid('id').defaultRandom().primaryKey(),
  launchId: uuid('launch_id').notNull().references(() => tokenLaunches.id, { onDelete: 'cascade' }),
  recipient: text('recipient').notNull(),
  amountRaw: text('amount_raw').notNull(),
  asset: text('asset'),
  claimed: boolean('claimed').notNull().default(false),
  claimableRaw: text('claimable_raw'),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ launchLookup: index('fee_observations_launch_idx').on(t.launchId) }));

export const museCreations = pgTable('muse_creations', {
 id: uuid('id').primaryKey(),
 userId: uuid('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
 ticker: text('ticker').notNull(), capsuleId: text('capsule_id').notNull(),
 fingerprint: text('fingerprint').notNull(), status: text('status').notNull().default('pending'),
  image: text('image'), receipt: text('receipt').unique(), error: text('error'),
  kind: text('kind').notNull().default('pfp'), pullGroup: text('pull_group'),
  momentLane: text('moment_lane'), momentText: text('moment_text'),
  free: boolean('free').notNull().default(false),
 public: boolean('public').notNull().default(false), eligible: boolean('eligible').notNull().default(false),
 createdAt: timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
 updatedAt: timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
 completedAt: timestamp('completed_at',{withTimezone:true}),
},t=>({userLookup:index('muse_creations_user_idx').on(t.userId,t.createdAt)}));

export const agentMoments = pgTable('agent_moments', {
  id: uuid('id').defaultRandom().primaryKey(),
  ticker: text('ticker').notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
},t=>({tickerLookup:index('agent_moments_ticker_idx').on(t.ticker,t.createdAt)}));

export const freePullDays = pgTable('free_pull_days', {
  userId: uuid('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
  day: date('day').notNull(),
  createdAt: timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
},t=>({pk:primaryKey({columns:[t.userId,t.day]})}));

// Last-good news snapshots so cold instances and slow weekends still serve.
// Rows are rewritten on each successful fetch; readers accept up to 72h old.
export const feedSnapshots = pgTable('feed_snapshots', {
  key: text('key').primaryKey(),
  items: jsonb('items').notNull(),
  updatedAt: timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
});

// Inbound webhook event log (e.g. Finnhub). Append-only audit; pruned by the writer.
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: text('source').notNull(),
  payload: jsonb('payload').notNull(),
  receivedAt: timestamp('received_at',{withTimezone:true}).notNull().defaultNow(),
});
