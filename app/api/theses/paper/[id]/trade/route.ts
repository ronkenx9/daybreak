import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { executePublicPaperTrade } from '@/lib/db/repo-theses';

export const dynamic = 'force-dynamic';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    if (!uuid.test(id)) throw new HttpError(400, 'Invalid paper thesis');
    const user = await requireUser(request);
    requireWriteCapacity(user.id);
    const body = await readJsonObject(request, 1_024);
    const direction = body.direction === 'buy' || body.direction === 'sell' ? body.direction : null;
    const amount = Number(body.amount);
    if (!direction) throw new HttpError(400, 'Choose Back or Sell');
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new HttpError(400, 'Enter a valid paper amount');
    if (typeof body.intentId !== 'string' || !uuid.test(body.intentId)) throw new HttpError(400, 'Invalid paper intent');
    const receipt = await executePublicPaperTrade(id, user.id, direction, amount, { intentId: body.intentId, minimumOutput: Number(body.minimumOutput), expiresAt: Number(body.expiresAt) });
    return Response.json({ receipt }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'PAPER_MARKET_NOT_FOUND') return errorResponse(new HttpError(404, 'Paper thesis not found'));
    if (error instanceof Error && error.message === 'PAPER_STOCK_BALANCE_LOW') return errorResponse(new HttpError(409, 'Not enough paper stock tokens'));
    if (error instanceof Error && error.message === 'PAPER_POSITION_LOW') return errorResponse(new HttpError(409, 'Not enough paper thesis tokens'));
    if (error instanceof Error && /^(Paper preview expired|Paper intent already used|Price moved beyond|Minimum received is required)/.test(error.message)) return errorResponse(new HttpError(409, error.message));
    return errorResponse(error);
  }
}
