export const dynamic = 'force-dynamic';
export async function POST() {
  return Response.json({ error: 'Generic token creation is retired. Existing receipts remain available in account history.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
