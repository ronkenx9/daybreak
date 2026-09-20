import { listPublicCircles } from '@/lib/db/repo';
import { errorResponse } from '@/lib/account/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json({ circles: await listPublicCircles() }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    const response = errorResponse(error);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }
}
