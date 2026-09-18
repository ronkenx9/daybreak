export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({ error: 'The generic DBC quote endpoint is retired. Open a published stock-paired thesis market.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
