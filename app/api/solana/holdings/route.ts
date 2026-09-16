import { readSolanaXstockHoldings } from '@/lib/solana/holdings';

export const dynamic = 'force-dynamic';
// base58, 32-44 chars; case-sensitive (no I, O, l, 0).
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get('address') ?? '';
  if (!BASE58.test(address)) return Response.json({ error: 'Invalid Solana address' }, { status: 400 });
  try {
    const snapshot = await readSolanaXstockHoldings(address);
    return Response.json(snapshot, { headers: { 'Cache-Control': 'public, max-age=15' } });
  } catch {
    return Response.json({ error: 'Solana holdings are unavailable right now' }, { status: 502 });
  }
}
