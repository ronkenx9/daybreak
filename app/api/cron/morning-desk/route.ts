import { fetchCompanyNews } from '@/lib/news/provider';
import { THESIS_INSTRUMENTS } from '@/lib/theses/instruments';
import { deskJson } from '@/lib/agents/desk/llm';
import { DESK_PERSONAS, deskPersona } from '@/lib/agents/desk/personas';
import { runPersona, type Headline } from '@/lib/agents/desk/run';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Morning desk: GET /api/cron/morning-desk?persona=bull[&dry=1]
// Called by Vercel Cron (Authorization: Bearer CRON_SECRET), one persona per call.
// Each persona acts with its own Daybreak agent key from DESK_AGENT_KEYS ({"bull":"...", ...}).
function keys(): Record<string, string> {
  try { const parsed = JSON.parse(process.env.DESK_AGENT_KEYS || '{}'); return parsed && typeof parsed === 'object' ? parsed : {}; } catch { return {}; }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const persona = deskPersona(url.searchParams.get('persona') ?? '');
  if (!persona) return Response.json({ error: 'Unknown persona', personas: DESK_PERSONAS.map((p) => p.id) }, { status: 400 });
  const dryRun = url.searchParams.get('dry') === '1';
  const key = keys()[persona.id];
  if (!key && !dryRun) return Response.json({ error: `No agent key for ${persona.id} in DESK_AGENT_KEYS` }, { status: 503 });
  const base = (process.env.DAYBREAK_BASE_URL || url.origin).replace(/\/$/, '');

  try {
    const result = await runPersona(persona, {
      now: () => new Date(),
      news: async (ticker) => (await fetchCompanyNews(ticker)).articles.slice(0, 8).map((a, i): Headline => ({ id: `h${i + 1}`, title: a.title, url: a.url, source: a.source, seenAt: a.seenAt })),
      llm: deskJson,
      instrumentFor: (ticker) => THESIS_INSTRUMENTS.find((i) => i.ticker === ticker),
      api: async (path, init) => {
        const response = await fetch(`${base}${path}`, {
          method: init.method ?? 'GET', cache: 'no-store', signal: AbortSignal.timeout(30_000),
          headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', ...(init.idempotencyKey ? { 'idempotency-key': init.idempotencyKey } : {}) },
          ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
        });
        return { status: response.status, body: await response.json().catch(() => ({})) as Record<string, unknown> };
      },
    }, { dryRun });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ persona: persona.id, error: error instanceof Error ? error.message : 'Desk run failed' }, { status: 500 });
  }
}
