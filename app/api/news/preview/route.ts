import { createRateLimit, createRequestCache } from '@/lib/server/requests';
import { articleIdentity } from '@/lib/news/url';
import { fetchArticlePreview } from '@/lib/news/preview';

export const dynamic = 'force-dynamic';
const allowed = createRateLimit(30);
const cached = createRequestCache<Awaited<ReturnType<typeof fetchArticlePreview>>>(60 * 60_000, 100, 3);

export async function POST(req: Request) {
  if (!allowed()) return Response.json({ error: 'Too many preview requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  let body: unknown; try { body = await req.json(); } catch { return Response.json({ error: 'Invalid preview request' }, { status: 400 }); }
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const identity = articleIdentity(input.ticker, input.url);
  if (!identity) return Response.json({ error: 'Invalid article' }, { status: 400 });
  try { return Response.json(await cached(identity.key, () => fetchArticlePreview(identity.url))); }
  catch { return Response.json({ summary: '', image: '' }); }
}
