import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const databaseUrl = process.env.DATABASE_URL?.trim();

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
  await migrate(drizzle(sql), { migrationsFolder: 'drizzle' });
  console.log('Daybreak database migrations applied.');
} catch (error) {
  console.error(`Migration failed: ${error instanceof Error ? error.name : 'Unknown database error'}.`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
