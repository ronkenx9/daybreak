import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { getResearchDashboard, setResearchSpendCap } from '@/lib/db/repo-economy';
import { researchMember } from '@/lib/economy/membership';
import { researchGatewayReady } from '@/lib/economy/research';

export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const [dashboard, member, available] = await Promise.all([getResearchDashboard(user.id), researchMember(req), researchGatewayReady()]);
    return Response.json({ ...dashboard, member, available }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(req: Request) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    const body = await readJsonObject(req);
    if (!Number.isInteger(body.dailySpendCapCents) || Number(body.dailySpendCapCents) < 0 || Number(body.dailySpendCapCents) > 1000) throw new HttpError(400, 'Choose a daily cap from $0 to $10.');
    return Response.json(await setResearchSpendCap(user.id, Number(body.dailySpendCapCents)));
  } catch (error) { return errorResponse(error instanceof Error && !('status' in error) ? new HttpError(409, error.message) : error); }
}
