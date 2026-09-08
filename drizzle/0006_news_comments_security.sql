-- Comments are only accessed through Daybreak's server routes. Direct browser
-- access through Supabase roles stays closed, matching the account tables.
ALTER TABLE "news_comments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "news_comments" FROM PUBLIC, anon, authenticated;
