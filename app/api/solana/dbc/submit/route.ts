import { NextResponse } from 'next/server';
import { solanaConnection } from '@/lib/solana/client';
import { createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';
const allowed = createRateLimit(30);

// Submit a fully-signed Solana transaction (base64) to the network. The creator has
// already signed with their own wallet client-side; the server only relays the bytes
// and returns the signature. It never signs and never holds keys.
export async function POST(req: Request) {
  if (!allowed()) return NextResponse.json({ error: 'Please retry shortly' }, { status: 429, headers: { 'Retry-After': '30' } });
  let body: { signedTransaction?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const b64 = typeof body.signedTransaction === 'string' ? body.signedTransaction : '';
  if (!b64 || b64.length > 8000) return NextResponse.json({ error: 'Missing signedTransaction' }, { status: 400 });
  let raw: Buffer;
  try { raw = Buffer.from(b64, 'base64'); } catch { return NextResponse.json({ error: 'Bad base64' }, { status: 400 }); }
  try {
    const conn = solanaConnection();
    const signature = await conn.sendRawTransaction(raw, { skipPreflight: false, maxRetries: 3 });
    return NextResponse.json({ signature }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Submit failed' }, { status: 502 });
  }
}
