// Isolated localhost database only (127.0.0.1:55439). Never reads DATABASE_URL or production data.
// Runs the morning desk against real migrations: system-owned agents, in-process agent API,
// real paper publish/quote/trade, idempotent reruns, and the user agent cap left intact.
const { loader } = require('./test-paper-behavior.cjs');
const postgres = require('postgres'), { drizzle } = require('drizzle-orm/postgres-js'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), { randomUUID } = require('node:crypto');

(async () => {
  const user = encodeURIComponent(require('node:os').userInfo().username);
  const name = 'desk_test_' + randomUUID().replaceAll('-', '');
  const root = postgres(`postgres://${user}@127.0.0.1:55439/postgres`, { max: 1, onnotice: () => {} });
  let sql;
  try {
    await root.unsafe(`CREATE DATABASE "${name}"`);
    sql = postgres(`postgres://${user}@127.0.0.1:55439/${name}`, { max: 6, onnotice: () => {} });
    for (const role of ['anon', 'authenticated']) await root.unsafe(`DO $$ BEGIN CREATE ROLE ${role}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    for (const file of fs.readdirSync('drizzle').filter((f) => f.endsWith('.sql')).sort()) await sql.unsafe(fs.readFileSync(path.join('drizzle', file), 'utf8').replaceAll('--> statement-breakpoint', ''));
    const schema = loader()('lib/db/schema.ts'), db = drizzle(sql, { schema });
    const load = loader({ [path.resolve('lib/db/client.ts')]: { getDb: () => db }, [path.resolve('lib/economy/research.ts')]: { RESEARCH_MODEL: 'test' } });
    const desk = load('lib/db/repo-desk.ts'), { inProcessAgentApi } = load('lib/agents/desk/inprocess.ts'), { runPersona, backOthers } = load('lib/agents/desk/run.ts');
    const { DESK_PERSONAS } = load('lib/agents/desk/personas.ts'), { THESIS_INSTRUMENTS } = load('lib/theses/instruments.ts'), agentsRepo = load('lib/db/repo-agents.ts');
    const [bull, skeptic] = ['bull', 'skeptic'].map((id) => DESK_PERSONAS.find((p) => p.id === id));

    // Agents are created once, under one system owner, beyond the user cap of 3.
    const ids = [];
    for (const p of DESK_PERSONAS) ids.push(await desk.ensureDeskAgent(p));
    assert.equal(await desk.ensureDeskAgent(bull), ids[0], 'idempotent');
    assert.equal(Number((await sql`select count(*) as n from agents`)[0].n), 5);
    assert.equal(Number((await sql`select count(distinct owner_user_id) as n from agents`)[0].n), 1);
    const [owner] = await sql`select u.privy_did, p.display_name from users u join profiles p on p.user_id = u.id where u.id = (select owner_user_id from agents limit 1)`;
    assert.equal(owner.privy_did, 'system:daybreak-morning-desk'); assert.equal(owner.display_name, 'Daybreak Morning Desk');
    const principal = await desk.deskPrincipal(ids[0]);
    assert.deepEqual([...principal.scopes].sort(), ['paper:publish', 'paper:trade', 'read']);
    assert.equal(principal.policy.dailyPublicationLimit, 1); assert.equal(principal.policy.allowedInstrumentIds.length, THESIS_INSTRUMENTS.length);

    const day = new Date();
    const news = async (t) => [1, 2].map((i) => ({ id: `h${i}`, title: `${t} headline ${i}`, url: `https://news.example.com/${t}/${i}`, source: 'Example', seenAt: new Date(Date.now() - i * 3600e3).toISOString() }));
    const draft = (t) => ({ title: `${t} has a strong setup this quarter`, summary: `Headlines point to a constructive near-term setup for ${t} according to this desk persona.`, body: `First paragraph about ${t} built from the headlines.\n\nSecond paragraph on risks and what to watch next quarter.`, invalidation: 'Guidance is cut in the next report.', horizon: '3 months', tokenSymbol: `${t}UP`, sourceIds: ['h1'] });
    const deps = (p, replies) => ({ now: () => day, news, llm: async () => replies.shift(), instrumentFor: (t) => THESIS_INSTRUMENTS.find((i) => i.ticker === t), api: inProcessAgentApi(p) });

    const today = day.toISOString().slice(0, 10);
    assert.equal(await desk.deskPublishedToday(principal.actorId, today), null, 'nothing published yet');
    // Bull publishes (nothing else to back yet).
    const r1 = await runPersona(bull, deps(principal, [draft('NVDA'), { picks: [] }]));
    assert.ok(r1.published?.id, 'bull published'); assert.equal(r1.ticker, 'NVDA');
    // Skeptic publishes, then backs Bull's fresh thesis with a real paper trade.
    const sp = await desk.deskPrincipal(ids[1]);
    const r2 = await runPersona(skeptic, deps(sp, [draft('TSLA'), { picks: [{ id: r1.published.id, rationale: 'Fair, the risks are named.' }] }]));
    assert.ok(r2.published?.id); assert.deepEqual(r2.backed.map((b) => b.thesisId), [r1.published.id]);
    const [trade] = await sql`select t.rationale, a.kind from paper_trades t join market_actors a on a.id = t.actor_id where t.thesis_id = ${r1.published.id}`;
    assert.equal(trade.kind, 'agent'); assert.equal(trade.rationale, 'Fair, the risks are named.');
    assert.equal(await desk.deskTradedToday(sp.actorId, today), true, 'skeptic traded today');
    assert.equal(await desk.deskTradedToday(principal.actorId, today), false, 'bull has not traded yet');
    // Bull already published; a backing-only rerun backs Skeptic's thesis with no second publish.
    const b = await backOthers(bull, deps(principal, [{ picks: [{ id: r2.published.id, rationale: 'Sharp downside case.' }] }]), { persona: 'bull', backed: [], dryRun: false });
    assert.deepEqual(b.backed.map((x) => x.thesisId), [r2.published.id]); assert.deepEqual(b.backing.errors, []);
    assert.equal(await desk.deskTradedToday(principal.actorId, today), true);
    const [thesis] = await sql`select mode, status from theses where id = ${r1.published.id}`;
    assert.equal(thesis.mode, 'paper');

    // The guard sees today's thesis (so the route returns before any model call), and not tomorrow's.
    assert.equal((await desk.deskPublishedToday(principal.actorId, today))?.id, r1.published.id);
    const tomorrow = new Date(day.getTime() + 86400e3).toISOString().slice(0, 10);
    assert.equal(await desk.deskPublishedToday(principal.actorId, tomorrow), null);
    // Re-running the same persona the same day does not publish twice.
    const again = await runPersona(bull, deps(principal, [draft('NVDA'), { picks: [] }]));
    assert.equal(again.published?.id, r1.published.id, 'idempotent publish');
    assert.equal(Number((await sql`select count(*) as n from theses where author_actor_id = ${principal.actorId}`)[0].n), 1);

    // Users still hit the cap of three agents.
    const u = randomUUID(); await sql`insert into users(id, privy_did) values (${u}, ${'did:u:' + u})`;
    const input = { name: 'Mine', strategy: '', avatar: 0, allowedInstrumentIds: [THESIS_INSTRUMENTS[0].id], scopes: ['read'], maxInputPerTrade: 5, dailyGrossBuy: 25, maxSlippageBps: 300, dailyPublicationLimit: 1 };
    for (let i = 0; i < 3; i++) await agentsRepo.createAgentForOwner(u, { ...input, name: 'Mine ' + i });
    await assert.rejects(() => agentsRepo.createAgentForOwner(u, { ...input, name: 'Mine 4' }), /up to three/);
    console.log('morning desk database tests passed');
  } finally {
    if (sql) await sql.end();
    await root.unsafe(`DROP DATABASE IF EXISTS "${name}"`).catch(() => {});
    await root.end();
  }
})().catch((e) => { console.error(e); process.exit(1); });
