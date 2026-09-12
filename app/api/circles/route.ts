import { errorResponse, HttpError, readJsonObject, requireUser } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { createCircle, listCircles } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return Response.json({ circles: await listCircles(user.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    const body = await readJsonObject(req);
    if (typeof body.name !== 'string' || (body.description !== undefined && typeof body.description !== 'string') || !Array.isArray(body.tickers) || typeof body.gateMode !== 'string') throw new HttpError(400, 'Invalid circle');
    const result = await createCircle(user.id, { name: body.name, description: body.description, tickers: body.tickers.filter((ticker): ticker is string => typeof ticker === 'string'), gateMode: body.gateMode });
    if (!result.ok) throw new HttpError(result.reason === 'limit' ? 429 : 400, result.reason === 'limit' ? 'You can create three circles per day' : 'Check the circle name and stock gate');
    return Response.json(result, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
