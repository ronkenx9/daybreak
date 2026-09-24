import 'server-only';
import type { DeskPersona } from './personas';

// One persona's morning: research → write → publish (paper) → back other agents' fresh ideas.
// Everything goes through the public agent API with the persona's own scoped key, so the desk
// obeys the same scopes, limits, quotes and idempotency as any outside agent. Paper only.

export interface Headline { id: string; title: string; url: string; source: string; seenAt: string }
export interface DeskDeps {
  news: (ticker: string) => Promise<Headline[]>;
  llm: (system: string, user: unknown, maxTokens?: number) => Promise<Record<string, unknown>>;
  api: (path: string, init: { method?: 'GET' | 'POST'; body?: unknown; idempotencyKey?: string }) => Promise<{ status: number; body: Record<string, unknown> }>;
  instrumentFor: (ticker: string) => { id: string; symbol: string; companyName: string } | undefined;
  now: () => Date;
}
export interface DeskResult {
  persona: string; ticker?: string; published?: { id: string; slug: string; title: string } | null;
  backed: Array<{ thesisId: string; title: string }>; skipped?: string; dryRun: boolean; draft?: Record<string, unknown>;
}

const clamp = (v: unknown, min: number, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s+\n/g, '\n').trim();
  if (s.length < min) return null;
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
};

export function buildThesisInput(raw: Record<string, unknown>, ticker: string, instrument: { id: string; companyName: string }, headlines: Headline[]) {
  const title = clamp(raw.title, 8, 100), summary = clamp(raw.summary, 20, 280), body = clamp(raw.body, 40, 4000);
  const invalidation = clamp(raw.invalidation, 10, 500), horizon = clamp(raw.horizon, 2, 80);
  let symbol = typeof raw.tokenSymbol === 'string' ? raw.tokenSymbol.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) : '';
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(symbol)) symbol = `${ticker.slice(0, 4)}AI`;
  const ids = new Set(Array.isArray(raw.sourceIds) ? raw.sourceIds.map(String) : []);
  const cited = headlines.filter((h) => ids.has(h.id));
  const sources = (cited.length ? cited : headlines.slice(0, 2)).slice(0, 5).map((h) => h.url);
  if (!title || !summary || !body || !invalidation) return null;
  return { instrumentId: instrument.id, title, summary, body, invalidation, horizon: horizon ?? '3 months', sources, tokenName: clamp(`${instrument.companyName} ${title.split(' ').slice(0, 3).join(' ')}`, 3, 32) ?? `${ticker} desk thesis`, tokenSymbol: symbol };
}

export async function runPersona(persona: DeskPersona, deps: DeskDeps, opts: { dryRun?: boolean } = {}): Promise<DeskResult> {
  const day = deps.now().toISOString().slice(0, 10);
  const dryRun = !!opts.dryRun;
  const result: DeskResult = { persona: persona.id, backed: [], dryRun };

  // 1. Research: the persona's company with the freshest headlines today.
  let pick: { ticker: string; headlines: Headline[] } | null = null;
  for (const ticker of persona.tickers) {
    const headlines = await deps.news(ticker).catch(() => [] as Headline[]);
    if (headlines.length && (!pick || headlines[0].seenAt > pick.headlines[0].seenAt)) pick = { ticker, headlines: headlines.slice(0, 8) };
  }
  if (!pick) return { ...result, skipped: 'no fresh headlines for this persona today' };
  const instrument = deps.instrumentFor(pick.ticker);
  if (!instrument) return { ...result, skipped: `no thesis instrument for ${pick.ticker}` };
  result.ticker = pick.ticker;

  // 2. Write: one opinionated, sourced paper thesis in the persona's voice.
  const draft = await deps.llm(
    `You are "${persona.name}", an AI analyst on Daybreak's morning desk. ${persona.style}\n` +
    `Write ONE public thesis about ${instrument.companyName} (${pick.ticker}) based ONLY on today's headlines provided. ` +
    'It is an opinion for a PAPER (simulated) market, not financial advice. Do not invent numbers, quotes or facts that are not in the headlines. ' +
    'Return ONLY JSON: {"title": 8-90 chars, a punchy claim; "summary": 1-2 sentences, max 260 chars; "body": 2-4 short paragraphs, 400-1200 chars, citing which headlines drove the view; ' +
    '"invalidation": what would prove this wrong, max 300 chars; "horizon": e.g. "3 months"; "tokenSymbol": 3-6 uppercase letters for the thesis token; "sourceIds": ids of the headlines you used}',
    { ticker: pick.ticker, company: instrument.companyName, today: day, headlines: pick.headlines.map((h) => ({ id: h.id, title: h.title, source: h.source, seenAt: h.seenAt })) },
  );
  const input = buildThesisInput(draft, pick.ticker, instrument, pick.headlines);
  if (!input) return { ...result, skipped: 'model output did not pass validation', draft };
  if (dryRun) return { ...result, draft: input };

  // 3. Publish (idempotent per persona per day: a retry never double-publishes).
  const published = await deps.api('/api/v1/agents/paper/theses', { method: 'POST', body: input, idempotencyKey: `desk-${day}-${persona.id}` });
  const thesis = published.body.thesis as { id?: string; slug?: string; title?: string } | undefined;
  result.published = published.status < 300 && thesis?.id ? { id: String(thesis.id), slug: String(thesis.slug), title: String(thesis.title) } : null;
  if (!result.published) return { ...result, skipped: `publish failed (${published.status}): ${JSON.stringify(published.body).slice(0, 200)}` };

  // 4. Back other agents' fresh ideas that fit this persona.
  const me = await deps.api('/api/v1/agents/me', {});
  const myId = (me.body.agent as { publicId?: string } | undefined)?.publicId;
  const feed = await deps.api('/api/v1/agents/theses?mode=paper&cursor=0', {});
  const items = (feed.body.items as Array<Record<string, unknown>> | undefined) ?? [];
  const fresh = items.filter((t) => t.authorKind === 'agent' && t.authorPublicId !== myId && String(t.publishedAt ?? '').slice(0, 10) === day).slice(0, 8);
  if (!fresh.length) return result;
  const choice = await deps.llm(
    `You are "${persona.name}". ${persona.style} You back ${persona.backs}. From these fresh theses by other agents, pick at most 2 you would genuinely back, with a one-sentence reason in your voice (max 200 chars). ` +
    'Return ONLY JSON: {"picks":[{"id": "...", "rationale": "..."}]}. Picking none is fine.',
    { theses: fresh.map((t) => ({ id: t.id, title: t.title, summary: t.summary })) }, 500,
  ).catch(() => ({ picks: [] }));
  const picks = Array.isArray(choice.picks) ? choice.picks as Array<{ id?: unknown; rationale?: unknown }> : [];
  for (const p of picks.slice(0, 2)) {
    const target = fresh.find((t) => t.id === p.id);
    if (!target) continue;
    const quote = await deps.api('/api/v1/agents/paper/quotes', { method: 'POST', body: { thesisId: target.id, direction: 'buy', amount: '1.0', maxSlippageBps: 300 } });
    const quoteId = (quote.body.quote as { quoteId?: string } | undefined)?.quoteId;
    if (quote.status >= 300 || !quoteId) continue;
    const rationale = clamp(p.rationale, 3, 280) ?? `${persona.name} backs this idea.`;
    const trade = await deps.api('/api/v1/agents/paper/trades', { method: 'POST', body: { quoteId, rationale }, idempotencyKey: `desk-t-${day}-${persona.id}-${String(target.id).slice(0, 8)}` });
    if (trade.status < 300) result.backed.push({ thesisId: String(target.id), title: String(target.title) });
  }
  return result;
}
