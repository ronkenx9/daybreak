import { errorResponse, HttpError, requireUser } from '@/lib/account/auth-server';
import { getPublicPaperMarket } from '@/lib/db/repo-theses';

import { pageNumber } from '@/lib/theses/discovery';

export const dynamic = 'force-dynamic';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    if (!uuid.test(id)) throw new HttpError(400, 'Invalid paper thesis');
    const viewer = new URL(request.url).searchParams.get('viewer') === '1' ? await requireUser(request) : null;
    const search = new URL(request.url).searchParams;
    const market = await getPublicPaperMarket(id, viewer?.id, { positions: pageNumber(search.get('positionsPage')), trades: pageNumber(search.get('tradesPage')), balances: pageNumber(search.get('balancesPage')) });
    if (!market) throw new HttpError(404, 'Paper thesis not found');
    return Response.json({ market }, { headers: { 'Cache-Control': viewer ? 'private, no-store' : 'public, s-maxage=5, stale-while-revalidate=10' } });
  } catch (error) { return errorResponse(error); }
}
