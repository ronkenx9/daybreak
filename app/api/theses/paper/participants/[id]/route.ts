import { getPaperPortfolio } from '@/lib/db/repo-theses';
import { timeIdCursor } from '@/lib/theses/paper-pagination';
import { errorResponse, HttpError } from '@/lib/account/auth-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^[a-f0-9]{64}$/.test(id)) throw new HttpError(404, 'Participant not found');
    let cursor;
    try { cursor = timeIdCursor(new URL(request.url).searchParams.get('cursor')); }
    catch { throw new HttpError(400, 'Invalid portfolio cursor'); }
    const portfolio = await getPaperPortfolio(id, cursor);
    if (!portfolio) throw new HttpError(404, 'Participant not found');
    return Response.json(portfolio, { headers: { 'Cache-Control': 'public, s-maxage=5' } });
  } catch (error) { return errorResponse(error); }
}
