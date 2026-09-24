import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { readVaultTheses } from '@/lib/xlayer/vault-read';
import { XLAYER_VAULT_ADDRESS } from '@/lib/xlayer/vault';
import { createRateLimit } from '@/lib/server/requests';
export const dynamic = 'force-dynamic';
const allowed = createRateLimit();
// Conviction theses from DaybreakConvictionVault on X Layer, newest first. ?backer=0x… adds that wallet's positions.
export async function GET(req: Request) {
  if (!XLAYER_VAULT_ADDRESS) return NextResponse.json({ error: 'The X Layer vault is not deployed yet' }, { status: 503 });
  const backer = new URL(req.url).searchParams.get('backer');
  if (backer && !isAddress(backer)) return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  if (!allowed()) return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429, headers: { 'Retry-After': '60' } });
  try { return NextResponse.json(await readVaultTheses((backer as `0x${string}`) ?? null), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'X Layer theses are unavailable right now.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' } }); }
}
