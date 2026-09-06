-- Custom SQL migration file, put your code below! --
-- Daybreak authorizes private data in its Next.js API with a verified Privy
-- identity. These tables are not exposed directly to browsers through the
-- Supabase Data API, so RLS is enabled with no public policies. The database
-- owner/pooled server connection remains the only data path.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookmarks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "circles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "circle_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "migration_imports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_discoveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "linked_wallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "watchlists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "watchlist_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wallet_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "operations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "community_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "token_pools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trade_quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "token_launches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fee_observations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "users", "profiles", "bookmarks", "circles", "circle_memberships", "migration_imports", "saved_discoveries", "linked_wallets", "watchlists", "watchlist_items", "wallet_connections", "operations", "community_tokens", "token_pools", "trade_quotes", "token_launches", "fee_observations" FROM PUBLIC, anon, authenticated;
