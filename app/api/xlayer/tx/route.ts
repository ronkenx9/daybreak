import { NextResponse } from 'next/server';
import { xlayerClient } from '@/lib/xlayer/client';
import { createRateLimit } from '@/lib/server/requests';
export const dynamic = 'force-dynamic';
const allowed = createRateLimit(240);
// Receipt status for an X Layer transaction the app submitted: pending | success | reverted.
export async function GET(req: Request) {
  const hash = new URL(req.url).searchParams.get('hash');
  if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) return NextResponse.json({ error: 'Invalid transaction hash' }, { status: 400 });
  if (!allowed()) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '10' } });
  try {
    const receipt = await xlayerClient.getTransactionReceipt({ hash: hash as `0x${string}` }).catch(() => null);
    return NextResponse.json({ hash, status: receipt ? receipt.status : 'pending', blockNumber: receipt ? receipt.blockNumber.toString() : null, explorerUrl: `https://www.oklink.com/xlayer/tx/${hash}` }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'X Layer is unavailable right now' }, { status: 503 }); }
}
