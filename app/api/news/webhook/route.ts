import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { fetchNewsFeed } from '@/lib/news/provider';

export const dynamic = 'force-dynamic';

// Finnhub event webhook. Every request carries X-Finnhub-Secret; anything else
// is refused WITHOUT a 2xx (forgeries must not count as acknowledged).
// On a valid event: audit it, pull one fresh feed (which refreshes the
// persisted snapshot), then 2xx. Downstream failures never block the ack.
function authorized(req: Request): boolean {
  const secret = process.env.FINNHUB_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const got = req.headers.get('x-finnhub-secret') ?? '';
  const a = Buffer.from(got, 'utf8');
  const b = Buffer.from(secret, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  let payload: unknown = null;
  try { payload = await req.json(); } catch { payload = null; }
  try {
    await getDb().execute(sql`INSERT INTO webhook_events(source,payload) VALUES ('finnhub',${JSON.stringify(payload ?? {})}::jsonb)`);
    await getDb().execute(sql`DELETE FROM webhook_events WHERE received_at<NOW()-INTERVAL '30 days'`);
  } catch { /* audit is best-effort; the ack must still go out */ }
  try { await fetchNewsFeed(); } catch { /* next poll covers it */ }
  return NextResponse.json({ ok: true });
}
