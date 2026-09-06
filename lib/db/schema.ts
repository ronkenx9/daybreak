import { pgTable, uuid, text, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

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
}, (t) => ({ uniqMember: uniqueIndex('circle_memberships_circle_user').on(t.circleId, t.userId) }));

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
}, (t) => ({ uniqWallet: uniqueIndex('linked_wallets_namespace_address').on(t.namespace, t.address) }));

export const watchlists = pgTable('watchlists', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  visibility: text('visibility').notNull().default('private'),
  circleId: uuid('circle_id').references(() => circles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const watchlistItems = pgTable('watchlist_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  watchlistId: uuid('watchlist_id').notNull().references(() => watchlists.id, { onDelete: 'cascade' }),
  companyId: text('company_id').notNull(),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uniqItem: uniqueIndex('watchlist_items_list_company').on(t.watchlistId, t.companyId) }));
