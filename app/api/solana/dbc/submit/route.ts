export const dynamic = 'force-dynamic';
export async function POST() {
  return Response.json({ error: 'The unauthenticated DBC relay is retired. Submit the signed intent-bound thesis operation.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
