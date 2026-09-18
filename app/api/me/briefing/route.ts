import { errorResponse, requireUser } from '@/lib/account/auth-server';
import { buildHoldingsBriefing } from '@/lib/briefing/service';
import { listEligibleHoldingInstruments } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const holdings = await listEligibleHoldingInstruments(user.id);
    const briefing = await buildHoldingsBriefing(holdings);
    return Response.json(briefing, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
