import { errorResponse, HttpError, requireUser } from '@/lib/account/auth-server';
import { listCircleMembers } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const slug = new URL(req.url).searchParams.get('slug') ?? '';
    if (!slug) throw new HttpError(400, 'Invalid circle');
    const result = await listCircleMembers(user.id, slug);
    if (!result.ok) throw new HttpError(result.reason === 'membership' ? 403 : 404, result.reason === 'membership' ? 'Join this circle to meet its members' : 'Circle not found');
    return Response.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
