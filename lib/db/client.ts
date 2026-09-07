import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DATABASE_URL = process.env.DATABASE_URL ?? '';
export const isDbConfigured = DATABASE_URL.length > 0;

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sql: ReturnType<typeof postgres> | null = null;

// Lazy singleton. `prepare:false` suits Supabase's transaction pooler.
export function getDb() {
  if (!isDbConfigured) throw new Error('DATABASE_URL is not set');
  if (!db) {
    // Bounded pool for serverless: keep few connections per instance so many
    // instances don't exhaust the Supabase transaction pooler, with explicit
    // connect/idle timeouts so a stuck provider can't pin a request open.
    sql = postgres(DATABASE_URL, {
      prepare: false,
      max: Number(process.env.DB_POOL_MAX ?? 5),
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
    });
    db = drizzle(sql, { schema });
  }
  return db;
}
