export const dynamic = 'force-dynamic';
export async function POST() {
  return Response.json({ error: 'Generic token launch previews are retired. Create a stock-paired thesis in Conviction.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
