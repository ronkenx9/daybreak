export const dynamic = 'force-dynamic';
export async function POST() {
  return Response.json({ error: 'The generic DBC launcher is retired. Create a stock-paired thesis in Conviction.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
