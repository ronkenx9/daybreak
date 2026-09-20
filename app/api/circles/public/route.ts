import { listPublicCircles } from '@/lib/db/repo';
import { errorResponse } from '@/lib/account/auth-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json({ circles: await listPublicCircles() }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
