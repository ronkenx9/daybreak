import { errorResponse, requireUser } from '@/lib/account/auth-server';
import { buildHoldingsBriefing } from '@/lib/briefing/service';
import { listEligibleHoldingSymbols } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const symbols = await listEligibleHoldingSymbols(user.id);
    const briefing = await buildHoldingsBriefing(symbols);
    return Response.json(briefing, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
