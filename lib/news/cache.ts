import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';

// Best-effort persistence for last-good news. Cache failures must never break
// the feed, so every function here swallows errors and returns null/false.
export async function saveSnapshot(key: string, items: unknown): Promise<void> {
  try {
    await getDb().execute(sql`INSERT INTO feed_snapshots(key,items,updated_at) VALUES (${key},${JSON.stringify(items)}::jsonb,NOW()) ON CONFLICT (key) DO UPDATE SET items=EXCLUDED.items,updated_at=NOW()`);
  } catch { /* feed stays live without cache */ }
}

export async function loadSnapshot<T>(key: string, maxAgeMs: number): Promise<T | null> {
  try {
    const rows = await getDb().execute(sql`SELECT items FROM feed_snapshots WHERE key=${key} AND updated_at>NOW()-(${maxAgeMs}::bigint * INTERVAL '1 millisecond')`);
    const items = rows[0]?.items;
    if (!items) return null;
    return (typeof items === 'string' ? JSON.parse(items) : items) as T;
  } catch {
    return null;
  }
}
