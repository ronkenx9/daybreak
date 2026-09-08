import { requireUser, errorResponse, HttpError, readJsonObject } from '@/lib/account/auth-server';
import { requireWriteCapacity } from '@/lib/account/request-guard';
import { createKeyedRateLimit } from '@/lib/server/requests';
import { articleIdentity } from '@/lib/news/url';
import { tokenForTicker } from '@/lib/base/tokens';
import { createNewsComment, listNewsComments, removeNewsComment } from '@/lib/db/repo';

export const dynamic = 'force-dynamic';
const canComment = createKeyedRateLimit(12, 60_000);

function identity(ticker: unknown, url: unknown) {
  const value = articleIdentity(ticker, url);
  if (!value || !tokenForTicker(value.ticker)) throw new HttpError(400, 'Invalid article');
  return value;
}

export async function GET(req: Request) {
  try {
    const query = new URL(req.url).searchParams;
    const item = identity(query.get('ticker'), query.get('url'));
    return Response.json({ comments: await listNewsComments(item.key) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req); requireWriteCapacity(user.id);
    if (!canComment(user.id)) throw new HttpError(429, 'Please wait before commenting again');
    const body = await readJsonObject(req, 4_096);
    const item = identity(body.ticker, body.url);
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
