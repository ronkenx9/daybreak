import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { xlayerClient } from '@/lib/xlayer/client';
import { xlayerStockFor } from '@/lib/xlayer/tokens';
export const dynamic = 'force-dynamic';
const abi = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'nonces', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const;
// Inputs for an EIP-2612 permit on a verified xStock: token name (domain) and the owner's current nonce.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const stock = xlayerStockFor(url.searchParams.get('symbol') ?? '');
  const owner = url.searchParams.get('owner');
  if (!stock || !owner || !isAddress(owner)) return NextResponse.json({ error: 'symbol and owner are required' }, { status: 400 });
  try {
    const [name, nonce] = await Promise.all([
      xlayerClient.readContract({ address: stock.token, abi, functionName: 'name' }),
      xlayerClient.readContract({ address: stock.token, abi, functionName: 'nonces', args: [owner] }),
    ]);
    return NextResponse.json({ token: stock.token, name, nonce: nonce.toString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'X Layer is unavailable right now' }, { status: 503 }); }
}
