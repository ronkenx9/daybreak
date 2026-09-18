import { requireUser, errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { createKeyedRateLimit } from '@/lib/server/requests';
import { articleIdentity } from '@/lib/news/url';
import { companyForSymbol } from '@/lib/assets/companies';
import { circleNewsAccess, createNewsComment, listNewsComments, removeNewsComment } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';
const canComment = createKeyedRateLimit(12, 60_000);

function identity(ticker: unknown, url: unknown, circleSlug?: unknown) {
  const value = articleIdentity(ticker, url, circleSlug);
  if (!value || !companyForSymbol(value.ticker)) throw new HttpError(400, 'Invalid article');
  return value;
}

async function circleIdentity(userId: string, ticker: unknown, url: unknown, circleSlug: unknown, requireMembership: boolean) {
  const slug = typeof circleSlug === 'string' ? circleSlug : '';
  const item = identity(ticker, url, slug);
  const access = await circleNewsAccess(userId, slug);
  if (!access.ok) throw new HttpError(access.reason === 'missing' ? 404 : 403, access.reason === 'missing' ? 'Circle not found' : 'This circle is locked');
  if (!access.tickers.includes(item.ticker)) throw new HttpError(400, 'Story does not belong to this circle');
  if (requireMembership && !access.member) throw new HttpError(403, 'Join this circle to comment');
  return item;
}

export async function GET(req: Request) {
  try {
    const query = new URL(req.url).searchParams;
    const circleSlug = query.get('circleSlug');
    const item = circleSlug
      ? await circleIdentity((await requireUser(req)).id, query.get('ticker'), query.get('url'), circleSlug, false)
      : identity(query.get('ticker'), query.get('url'));
    return Response.json({ comments: await listNewsComments(item.key) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    if (!canComment(user.id)) throw new HttpError(429, 'Please wait before commenting again');
    const body = await readJsonObject(req, 4_096);
    const item = body.circleSlug
      ? await circleIdentity(user.id, body.ticker, body.url, body.circleSlug, true)
      : identity(body.ticker, body.url);
    const comment = typeof body.body === 'string' ? body.body.trim() : '';
    if (comment.length < 2 || comment.length > 500) throw new HttpError(400, 'Comment must be 2–500 characters');
    const row = await createNewsComment(user.id, { articleKey: item.key, articleUrl: item.url, ticker: item.ticker, body: comment });
    return Response.json({ ok: true, id: row.id });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    const id = new URL(req.url).searchParams.get('id') ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(400, 'Invalid comment');
    await removeNewsComment(user.id, id);
    return Response.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
