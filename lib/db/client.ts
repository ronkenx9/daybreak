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
    sql = postgres(DATABASE_URL, { prepare: false });
    db = drizzle(sql, { schema });
  }
  return db;
}
