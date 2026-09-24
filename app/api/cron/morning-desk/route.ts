import { fetchCompanyNews } from '@/lib/news/provider';
import { THESIS_INSTRUMENTS } from '@/lib/theses/instruments';
import { deskJson } from '@/lib/agents/desk/llm';
import { DESK_PERSONAS, deskPersona } from '@/lib/agents/desk/personas';
import { runPersona, type Headline } from '@/lib/agents/desk/run';
import { inProcessAgentApi } from '@/lib/agents/desk/inprocess';
import { deskPrincipal, deskPublishedToday, ensureDeskAgent } from '@/lib/db/repo-desk';
import { createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Morning desk: GET /api/cron/morning-desk?persona=bull[&dry=1]
// Called by Vercel Cron, one persona per call. Each persona is a system-owned Daybreak agent,
// created on first run (lib/db/repo-desk.ts).
//
// Calls are safe to repeat: once a persona has published today, the route returns before any
// model call, so at most one paper thesis per persona per day is possible. When CRON_SECRET is
// set it is required; dry runs (a model call that publishes nothing) always require it.
const allowed = createRateLimit(30);

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorized = !!secret && request.headers.get('authorization') === `Bearer ${secret}`;
  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dry') === '1';
  if ((secret && !authorized) || (dryRun && !authorized)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!allowed()) return Response.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  const persona = deskPersona(url.searchParams.get('persona') ?? '');
  if (!persona) return Response.json({ error: 'Unknown persona', personas: DESK_PERSONAS.map((p) => p.id) }, { status: 400 });

  try {
    const principal = dryRun ? null : await deskPrincipal(await ensureDeskAgent(persona));
    if (principal) {
      const done = await deskPublishedToday(principal.actorId, new Date().toISOString().slice(0, 10));
      if (done) return Response.json({ persona: persona.id, published: done, backed: [], skipped: 'already published today', dryRun: false }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const result = await runPersona(persona, {
      now: () => new Date(),
      news: async (ticker) => (await fetchCompanyNews(ticker)).articles.slice(0, 8).map((a, i): Headline => ({ id: `h${i + 1}`, title: a.title, url: a.url, source: a.source, seenAt: a.seenAt })),
      llm: deskJson,
      instrumentFor: (ticker) => THESIS_INSTRUMENTS.find((i) => i.ticker === ticker),
      api: principal ? inProcessAgentApi(principal) : async () => ({ status: 400, body: { error: 'dry run' } }),
    }, { dryRun });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ persona: persona.id, error: error instanceof Error ? error.message : 'Desk run failed' }, { status: 500 });
  }
}
