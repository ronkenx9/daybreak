// Behavior tests for the morning desk with mocked news, LLM and agent API. No network.
const { loader } = require('./test-paper-behavior.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const load = loader({ [path.resolve('lib/economy/research.ts')]: { RESEARCH_MODEL: 'test-model' } });
  const { runPersona, buildThesisInput } = load('lib/agents/desk/run.ts');
  const { DESK_PERSONAS } = load('lib/agents/desk/personas.ts');
  const { normalizeAgentPaperThesis, requireIdempotencyKey } = load('lib/agents/validation.ts');
  const { THESIS_INSTRUMENTS } = load('lib/theses/instruments.ts');
  const bull = DESK_PERSONAS.find((p) => p.id === 'bull');
  const today = new Date('2026-09-25T07:00:00Z');
  const headlines = (t) => [1, 2, 3].map((i) => ({ id: `h${i}`, title: `${t} headline ${i}`, url: `https://news.example.com/${t}/${i}`, source: 'Example', seenAt: `2026-09-25T0${i}:00:00Z` }));
  const draft = { title: 'NVIDIA demand keeps outrunning supply', summary: 'Hyperscaler capex headlines point to another strong quarter for data-center GPUs.', body: 'Paragraph one about demand from the headlines (h1, h4).\n\nParagraph two about supply and what the headlines imply for the next quarter (h2).', invalidation: 'Two hyperscalers cut capex guidance.', horizon: '3 months', tokenSymbol: 'nvgo!', sourceIds: ['h2'] };

  // All personas cover real Solana thesis instruments, with no overlap.
  const all = DESK_PERSONAS.flatMap((p) => p.tickers);
  assert.equal(new Set(all).size, all.length, 'personas must not share tickers');
  for (const t of all) assert.ok(THESIS_INSTRUMENTS.some((i) => i.ticker === t), `${t} must be a thesis instrument`);

  // The built input passes the real agent API validator.
  const inst = THESIS_INSTRUMENTS.find((i) => i.ticker === 'NVDA');
  const input = buildThesisInput(draft, 'NVDA', inst, headlines('NVDA'));
  const normalized = normalizeAgentPaperThesis(input);
  assert.equal(normalized.instrumentId, inst.id);
  assert.equal(input.tokenSymbol, 'NVGO');
  assert.ok(!/\(h\d/.test(input.body), 'headline ids are stripped: ' + input.body);
  assert.match(input.body, /from the headlines\./);
  assert.equal(buildThesisInput({ ...draft, tokenSymbol: 'NVDA' }, 'NVDA', inst, headlines('NVDA'), 'bull').tokenSymbol, 'NVDABULL', 'symbol never equals the ticker');
  assert.deepEqual(input.sources, ['https://news.example.com/NVDA/2'], 'cites only the headlines the model used');
  assert.equal(buildThesisInput({ ...draft, summary: 'too short' }, 'NVDA', inst, headlines('NVDA')), null, 'invalid output is rejected');

  const makeDeps = (llmReplies) => {
    const calls = [];
    return { calls, deps: {
      now: () => today,
      news: async (t) => headlines(t),
      llm: async () => llmReplies.shift(),
      instrumentFor: (t) => THESIS_INSTRUMENTS.find((i) => i.ticker === t),
      api: async (p, init) => {
        calls.push({ p, init });
        if (init.idempotencyKey) requireIdempotencyKey(new Request('https://x', { headers: { 'idempotency-key': init.idempotencyKey } }));
        if (p === '/api/v1/agents/paper/theses') { normalizeAgentPaperThesis(init.body); return { status: 201, body: { thesis: { id: '11111111-1111-4111-8111-111111111111', slug: 'nvidia-demand', title: init.body.title } } }; }
        if (p === '/api/v1/agents/me') return { status: 200, body: { agent: { publicId: 'me-pub' } } };
        if (p.startsWith('/api/v1/agents/theses')) return { status: 200, body: { items: [
          { id: '22222222-2222-4222-8222-222222222222', title: 'Skeptic on TSLA', summary: 's', authorKind: 'agent', authorPublicId: 'other', publishedAt: '2026-09-25T07:05:00Z' },
          { id: '33333333-3333-4333-8333-333333333333', title: 'Old agent idea', summary: 's', authorKind: 'agent', authorPublicId: 'other', publishedAt: '2026-09-24T07:05:00Z' },
          { id: '44444444-4444-4444-8444-444444444444', title: 'Human idea', summary: 's', authorKind: 'human', authorPublicId: 'h', publishedAt: '2026-09-25T06:00:00Z' },
          { id: '11111111-1111-4111-8111-111111111111', title: 'My own', summary: 's', authorKind: 'agent', authorPublicId: 'me-pub', publishedAt: '2026-09-25T07:00:00Z' },
        ] } };
        if (p === '/api/v1/agents/paper/quotes') return { status: 201, body: { quote: { quoteId: 'q-' + init.body.thesisId.slice(0, 4) } } };
        if (p === '/api/v1/agents/paper/trades') return { status: 201, body: { receipt: {} } };
        throw new Error('unexpected ' + p);
      },
    } };
  };

  // Full run: publishes once, then backs only today's theses by OTHER agents.
  const { calls, deps } = makeDeps([draft, { picks: [{ id: '22222222-2222-4222-8222-222222222222', rationale: 'Good risk framing.' }, { id: '33333333-3333-4333-8333-333333333333' }, { id: '44444444-4444-4444-8444-444444444444' }] }]);
  const r = await runPersona(bull, deps);
  assert.equal(r.ticker, 'NVDA');
  assert.equal(r.published.slug, 'nvidia-demand');
  assert.deepEqual(r.backed.map((b) => b.thesisId), ['22222222-2222-4222-8222-222222222222'], 'only fresh, other-agent theses');
  const publish = calls.find((c) => c.p === '/api/v1/agents/paper/theses');
  assert.equal(publish.init.idempotencyKey, 'desk-2026-09-25-bull');
  const trade = calls.find((c) => c.p === '/api/v1/agents/paper/trades');
  assert.equal(trade.init.body.rationale, 'Good risk framing.');
  assert.equal(calls.find((c) => c.p === '/api/v1/agents/paper/quotes').init.body.direction, 'buy');

  // Dry run: drafts but never calls the agent API.
  const dry = makeDeps([draft]);
  const d = await runPersona(bull, dry.deps, { dryRun: true });
  assert.equal(dry.calls.length, 0); assert.equal(d.dryRun, true); assert.ok(d.draft.title);

  // Bad model output: nothing is published.
  const bad = makeDeps([{ title: 'x' }]);
  const b = await runPersona(bull, bad.deps);
  assert.match(b.skipped, /validation/); assert.equal(bad.calls.length, 0);

  // No news: skipped without calling the model.
  const quiet = makeDeps([]); quiet.deps.news = async () => [];
  assert.match((await runPersona(bull, quiet.deps)).skipped, /no fresh headlines/);
  console.log('morning desk tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
