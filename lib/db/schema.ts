import { index, pgTable, uuid, text, date, integer, boolean, timestamp, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';

// One internal user per verified Privy identity. We key on the Privy DID, never
// on email or wallet address (those can change or be shared).
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  privyDid: text('privy_did').notNull().unique(),
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
  bio: text('bio'),
  visibility: text('visibility').notNull().default('private'),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

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
  visibility: text('visibility').notNull().default('public'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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
