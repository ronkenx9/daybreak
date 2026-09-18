import { getPaperPortfolio } from '@/lib/db/repo-theses';
import { pageNumber } from '@/lib/theses/discovery';
import { errorResponse, HttpError } from '@/lib/account/auth-server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^[a-f0-9]{64}$/.test(id)) throw new HttpError(404, 'Participant not found');
    const portfolio = await getPaperPortfolio(id, pageNumber(new URL(request.url).searchParams.get('page')));
    if (!portfolio) throw new HttpError(404, 'Participant not found');
    return Response.json(portfolio, { headers: { 'Cache-Control': 'public, s-maxage=5' } });
  } catch (error) { return errorResponse(error); }
}
