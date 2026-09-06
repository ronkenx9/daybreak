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
  const details = [];
  let current = error;
  while (current && typeof current === 'object' && details.length < 3) {
    const code = typeof current.code === 'string' ? ` (${current.code})` : '';
    const message = current instanceof Error ? current.message : 'Unknown database error';
    details.push(`${message}${code}`);
    current = current.cause;
  }
  console.error(`Migration failed: ${details.join(' → ')}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
