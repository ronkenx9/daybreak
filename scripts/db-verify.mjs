import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL?.trim();
const expectedTables = [
  'users', 'profiles', 'profile_photos', 'bookmarks', 'circles', 'circle_memberships',
  'migration_imports', 'saved_discoveries', 'linked_wallets', 'watchlists',
  'watchlist_items', 'wallet_connections', 'operations', 'community_tokens',
  'token_pools', 'trade_quotes', 'token_launches', 'fee_observations',
  'news_comments', 'circle_discoveries', 'discovery_saves', 'user_blocks',
  'content_reports', 'muse_creations', 'agent_moments', 'free_pull_days',
  'feed_snapshots', 'webhook_events', 'holding_eligibilities',
  'theses', 'thesis_markets', 'thesis_updates', 'thesis_follows',
  'thesis_comments', 'thesis_trade_quotes', 'paper_thesis_markets',
  'paper_stock_balances', 'paper_positions', 'paper_trades',
  'market_actors', 'agents', 'agent_api_keys', 'agent_policies',
  'agent_budget_windows', 'agent_quotes', 'agent_requests', 'agent_audit_events',
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

  const [paperMode] = await sql`
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'theses' and column_name = 'mode'
    ) as present
  `;
  if (!paperMode?.present) throw new Error('Missing theses.mode');

  const [actorState] = await sql`
    select
      (select count(*)::int from theses where author_actor_id is null) as missing_thesis_actors,
      (select count(*)::int from paper_stock_balances where actor_id is null) as missing_balance_actors,
      (select count(*)::int from paper_positions where actor_id is null) as missing_position_actors,
      (select count(*)::int from paper_trades where actor_id is null) as missing_trade_actors,
      (select count(*)::int from users u left join market_actors a on a.user_id = u.id where a.id is null) as missing_human_actors
  `;
  const invalidActors = Object.entries(actorState ?? {}).filter(([, value]) => Number(value) !== 0);
  if (invalidActors.length) throw new Error(`Actor backfill incomplete: ${invalidActors.map(([key, value]) => `${key}=${value}`).join(', ')}`);

  console.log(`Database ready: ${expectedTables.length} Daybreak tables with RLS enabled; market actor backfill complete.`);
} catch (error) {
  console.error(`Database verification failed: ${error instanceof Error ? error.message : 'Unknown database error'}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
