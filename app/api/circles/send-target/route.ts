import { errorResponse, HttpError, requireUser } from '@/lib/account/auth-server';
import { resolveSendTarget } from '@/lib/db/repo-send';
import { createKeyedRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';
const allowed = createKeyedRateLimit(30, 60_000);
const MESSAGES = {
  membership: [403, 'Join this circle to send stock to its members'],
  missing: [404, 'That member is no longer in this circle'],
  self: [400, 'You cannot send stock to yourself'],
  not_receiving: [409, 'This member has not turned on receiving stock from their circles'],
} as const;

// Resolve a circle member to a transfer address for a stock send. Discloses an address only
// between members of the same circle, and only for recipients who opted in.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (!allowed(user.id)) throw new HttpError(429, 'Too many requests. Try again shortly');
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') ?? '';
    const member = url.searchParams.get('member') ?? '';
    if (!slug || !/^[0-9a-f-]{36}$/i.test(member)) throw new HttpError(400, 'Invalid circle member');
    const target = await resolveSendTarget(user.id, slug, member);
    if (!target.ok) { const [status, message] = MESSAGES[target.reason]; throw new HttpError(status, message); }
    return Response.json(target, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
