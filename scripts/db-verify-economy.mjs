import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required');
const sql = postgres(databaseUrl, { prepare: false, max: 1, connect_timeout: 10, idle_timeout: 5 });
const tables = ['economy_accounts', 'economy_quotes', 'economy_payments', 'economy_entries', 'economy_service_orders', 'economy_challenges', 'economy_submissions', 'economy_awards'];
try {
  const rows = await sql`
    SELECT c.relname AS name, c.relrowsecurity AS rls,
      has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS anon_access,
      has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS authenticated_access
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY(${tables}) AND c.relkind = 'r'
  `;
  if (rows.length !== tables.length || rows.some(row => !row.rls || row.anon_access || row.authenticated_access)) throw new Error('Economy tables, RLS or direct-client grants are incomplete');
  const [totals] = await sql`
    SELECT
      (SELECT COALESCE(SUM(credits_cents),0) FROM economy_payments)::bigint AS purchased,
      (SELECT COALESCE(SUM(balance_cents),0) FROM economy_accounts)::bigint AS available,
      (SELECT COALESCE(SUM(cost_cents),0) FROM economy_service_orders)::bigint AS delivered,
      (SELECT COALESCE(SUM(budget_cents),0) FROM economy_challenges WHERE status='open')::bigint AS reserved
  `;
  if (BigInt(totals.purchased) !== BigInt(totals.available) + BigInt(totals.delivered) + BigInt(totals.reserved)) throw new Error('Credit liability does not reconcile to verified purchases');
  console.log('ECONOMY_DB_OK');
} finally { await sql.end({ timeout: 5 }); }
