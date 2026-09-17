import { NextResponse } from 'next/server';
import { readDbcPoolStatus } from '@/lib/solana/dbc/monitor';
import { createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';
const allowed = createRateLimit(120);

// Issuer/monitoring view: curve progress toward graduation + current on-curve price.
export async function GET(req: Request) {
  if (!allowed()) return NextResponse.json({ error: 'Please retry shortly' }, { status: 429, headers: { 'Retry-After': '30' } });
  const address = new URL(req.url).searchParams.get('address') ?? '';
  try {
    const status = await readDbcPoolStatus(address);
    return NextResponse.json(status, { headers: { 'Cache-Control': 'private, max-age=15' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Pool unavailable' }, { status: 400 });
  }
}
