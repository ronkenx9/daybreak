import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL?.trim();
const expectedTables = [
  'users', 'profiles', 'bookmarks', 'circles', 'circle_memberships',
  'migration_imports', 'saved_discoveries', 'linked_wallets', 'watchlists',
  'watchlist_items', 'wallet_connections', 'operations', 'community_tokens',
  'token_pools', 'trade_quotes', 'token_launches', 'fee_observations',
  'news_comments', 'circle_discoveries', 'discovery_saves', 'user_blocks',
  'content_reports', 'muse_creations', 'agent_moments', 'free_pull_days',
  'feed_snapshots', 'webhook_events', 'holding_eligibilities',
];

if (!databaseUrl) {
  console.error('DATABASE_URL is required. Add the Supabase pooled Postgres connection string to .env.local.');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  prepare: false,
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5,
});

try {
  const tables = await sql`
    select tablename
    from pg_tables
    where schemaname = 'public'
  `;
  const present = new Set(tables.map(({ tablename }) => tablename));
  const missing = expectedTables.filter((table) => !present.has(table));
  if (missing.length) throw new Error(`Missing tables: ${missing.join(', ')}`);

  const rls = await sql`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = any(${expectedTables})
      and c.relrowsecurity = true
  `;
  const rlsEnabled = new Set(rls.map(({ relname }) => relname));
  const unprotected = expectedTables.filter((table) => !rlsEnabled.has(table));
  if (unprotected.length) throw new Error(`RLS is not enabled: ${unprotected.join(', ')}`);

  console.log(`Database ready: ${expectedTables.length} Daybreak tables with RLS enabled.`);
} catch (error) {
  console.error(`Database verification failed: ${error instanceof Error ? error.message : 'Unknown database error'}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
