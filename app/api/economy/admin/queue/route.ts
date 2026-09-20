import { errorResponse } from '@/lib/account/auth-server';
import { listEconomyOperatorQueue } from '@/lib/db/repo-economy';
import { requireEconomyAdmin } from '@/lib/economy/admin';

export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try { await requireEconomyAdmin(req); return Response.json(await listEconomyOperatorQueue(), { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return errorResponse(error); }
}
