import { NextResponse } from 'next/server';
import { buildLaunchTransaction } from '@/lib/solana/dbc/launch';
import { createKeyedRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';

// Build (do not send) a DBC launch transaction. Returns an unsigned/partial-signed
// base64 transaction the creator signs as fee payer via Privy and submits themselves.
// No funds move server-side; the creator authorizes and pays for the launch.
const limit = createKeyedRateLimit(10, 60_000);

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const creator = typeof body.creator === 'string' ? body.creator : '';
  if (!limit(creator || 'anon')) return NextResponse.json({ error: 'Please retry shortly' }, { status: 429, headers: { 'Retry-After': '30' } });
  try {
    const build = await buildLaunchTransaction({
      creator,
      name: String(body.name ?? ''),
      symbol: String(body.symbol ?? ''),
      uri: String(body.uri ?? ''),
      referenceValuationUsd: Number(body.referenceValuationUsd),
      totalTokenSupply: body.totalTokenSupply != null ? Number(body.totalTokenSupply) : undefined,
    });
    return NextResponse.json(build, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not build launch' }, { status: 400 });
  }
}
