// Isolated local PostgreSQL integration and mocked provider; no live charges.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const { loader } = require('./test-paper-behavior.cjs');

(async () => {
  const user = encodeURIComponent(os.userInfo().username);
  const database = `economy_service_test_${randomUUID().replaceAll('-', '')}`;
  const root = postgres(`postgres://${user}@127.0.0.1:55439/postgres`, { max: 1 });
  let sql;
  try {
    await root.unsafe(`CREATE DATABASE "${database}"`);
    sql = postgres(`postgres://${user}@127.0.0.1:55439/${database}`, { max: 8 });
    for (const role of ['anon', 'authenticated']) await root.unsafe(`DO $$ BEGIN CREATE ROLE ${role}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await sql.unsafe(`
      CREATE TABLE users(id uuid PRIMARY KEY);
      CREATE TABLE circles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL, status text NOT NULL DEFAULT 'active', creator_user_id uuid REFERENCES users(id), pinned_until timestamptz);
      CREATE TABLE circle_memberships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), circle_id uuid NOT NULL REFERENCES circles(id), user_id uuid NOT NULL REFERENCES users(id), status text NOT NULL DEFAULT 'active');
      CREATE TABLE circle_pins(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), circle_id uuid NOT NULL REFERENCES circles(id), user_id uuid NOT NULL REFERENCES users(id), tx_hash text UNIQUE NOT NULL, amount_raw text NOT NULL, pinned_until timestamptz NOT NULL, created_at timestamptz DEFAULT now());
    `);
    await sql.unsafe(fs.readFileSync('drizzle/0024_economy.sql', 'utf8'));
    await sql.unsafe(fs.readFileSync('drizzle/0025_economy_services.sql', 'utf8'));
    const db = drizzle(sql, { schema: loader()('lib/db/schema.ts') });
    const repo = loader({ [path.resolve('lib/db/client.ts')]: { getDb: () => db } })('lib/db/repo-economy.ts');
    const owner = randomUUID(), worker = randomUUID(), other = randomUUID(), circle = randomUUID();
    await sql`INSERT INTO users(id) VALUES (${owner}),(${worker}),(${other})`;
    await sql`INSERT INTO circles(id,slug,creator_user_id) VALUES (${circle},'nvidia-room',${owner})`;
    await sql`INSERT INTO circle_memberships(circle_id,user_id) VALUES (${circle},${worker})`;
    const quote = await repo.createCreditQuote(owner, '0x0000000000000000000000000000000000000001', 500);
    const txHash = `0x${'a'.repeat(64)}`;
    await repo.confirmCreditPurchase(owner, quote.id, txHash);
    const otherQuote = await repo.createCreditQuote(other, '0x0000000000000000000000000000000000000002', 500);
    await repo.confirmCreditPurchase(other, otherQuote.id, `0x${'c'.repeat(64)}`);
    const first = await repo.startResearchJob(owner, 'NVDA', randomUUID(), 0, false);
    assert.equal(first.job.costCents, 0);
    const result = { symbol: 'NVDA', summary: { text: 'Fresh evidence is mixed.', sources: [1] }, sources: [{ id: 1, title: 'News', url: 'https://example.org', publisher: 'Example', publishedAt: new Date().toISOString() }], bull: [], bear: [], watch: [] };
    await repo.finishResearchJob(owner, first.job.id, result);
    const failKey = randomUUID();
    const failing = await repo.startResearchJob(owner, 'NVDA', failKey, 25, false);
    assert.equal(failing.job.costCents, 25);
    assert.equal((await repo.startResearchJob(owner, 'NVDA', failKey, 25, false)).created, false);
    assert.equal((await repo.getEconomyAccount(owner)).balanceCents, 475);
    await repo.failResearchJob(owner, failing.job.id);
    assert.equal(await repo.failResearchJob(owner, failing.job.id), false);
    assert.equal((await repo.getEconomyAccount(owner)).balanceCents, 500);
    const member = await repo.startResearchJob(owner, 'AAPL', randomUUID(), 20, true);
    assert.equal(member.job.costCents, 20);
    assert.equal(member.job.memberDiscountCents, 5);
    await repo.finishResearchJob(owner, member.job.id, { ...result, symbol: 'AAPL' });
    await repo.setResearchSpendCap(owner, 20);
    await assert.rejects(() => repo.startResearchJob(owner, 'TSLA', randomUUID(), 25, false), /daily research spending cap/);
    await repo.setResearchSpendCap(owner, 100);
    const concurrent = await Promise.all([
      repo.startResearchJob(other, 'NVDA', randomUUID(), 25, false),
      repo.startResearchJob(other, 'AAPL', randomUUID(), 25, false),
    ]);
    assert.deepEqual(concurrent.map(item => item.job.costCents).sort((a,b) => a-b), [0,25]);
    for (const item of concurrent) await repo.finishResearchJob(other, item.job.id, { ...result, symbol: item.job.symbol });
    const stale = await repo.startResearchJob(owner, 'MSFT', randomUUID(), 25, false);
    await sql`UPDATE economy_research_jobs SET created_at=now()-interval '3 minutes' WHERE id=${stale.job.id}`;
    await repo.startResearchJob(owner, 'META', randomUUID(), 25, false).then(async next => { await repo.failResearchJob(owner, next.job.id); });
    assert.equal((await sql`SELECT status FROM economy_research_jobs WHERE id=${stale.job.id}`)[0].status, 'failed');
    assert.equal((await repo.getEconomyAccount(owner)).balanceCents, 480);
    const options = await repo.listCreditRefunds(owner);
    assert.equal(options.payments[0].remainingCents, 500);
    const requested = await repo.requestCreditRefund(owner, txHash, 100, 'I will not use these credits.');
    assert.equal(requested.wallet, '0x0000000000000000000000000000000000000001');
    assert.equal((await repo.getEconomyAccount(owner)).balanceCents, 380);
    await repo.cancelCreditRefund(owner, requested.id);
    assert.equal((await repo.getEconomyAccount(owner)).balanceCents, 480);
    const second = await repo.requestCreditRefund(owner, txHash, 100, 'I will not use these credits.');
    await assert.rejects(() => repo.requestCreditRefund(owner, txHash, 100, 'I will not use these credits.'), error => error.cause?.code === '23505');
    await repo.resolveCreditRefund(second.id, 'denied', worker, 'Unused purchase cannot be refunded in this test.');
    assert.equal((await repo.getEconomyAccount(owner)).balanceCents, 480);
    const third = await repo.requestCreditRefund(owner, txHash, 100, 'I will not use these credits.');
    await assert.rejects(() => repo.resolveCreditRefund(third.id, 'fulfilled', worker, 'Attempt to skip the claim step.', `0x${'b'.repeat(64)}`), /Claim this refund/);
    await assert.rejects(() => repo.resolveCreditRefund(third.id, 'denied', owner, 'I reviewed my own request.'), /own refund/);
    await repo.resolveCreditRefund(third.id, 'processing', worker, 'Claimed for an exact treasury USDC refund.');
    await assert.rejects(() => repo.cancelCreditRefund(owner, third.id), /cannot be cancelled/);
    await repo.resolveCreditRefund(third.id, 'fulfilled', worker, 'Exact treasury USDC refund verified.', `0x${'b'.repeat(64)}`);
    assert.equal((await repo.getEconomyAccount(owner)).balanceCents, 380);
    const challenge = await repo.createChallenge(owner, 'nvidia-room', { title: 'Examine Nvidia market evidence', brief: 'Collect the strongest recent evidence for and against the claim.', criteria: 'Cite sources and a clear falsifying signal.', budgetCents: 100, deadline: new Date(Date.now() + 2 * 86_400_000), idempotencyKey: randomUUID() });
    const submission = await repo.submitChallenge(worker, challenge.id, 'https://example.org/work', 'Evidence is mixed, and the main risk is customer concentration.');
    await repo.fileChallengeDispute(worker, challenge.id, 'The sponsor changed the evaluation criteria after submission.');
    await assert.rejects(() => repo.awardChallenge(owner, challenge.id, submission.id), /unavailable/);
    await assert.rejects(() => repo.resolveChallengeDispute(challenge.id, 'refund', 'The sponsor cannot decide this dispute.', owner), /own challenge/);
    await repo.resolveChallengeDispute(challenge.id, 'refund', 'Review found the challenge criteria were not met.', other);
    assert.equal((await repo.getEconomyAccount(owner)).balanceCents, 380);
    const stats = await repo.economyPublicStats();
    assert.equal(stats.creditsPurchasedCents - stats.creditsRefundedCents, stats.outstandingCreditsCents + stats.servicesDeliveredCents + stats.openChallengeCents + stats.pendingRefundCents + stats.pendingResearchCents);
    assert.equal(stats.servicesDeliveredCents, 45);
    assert.equal((await repo.getResearchDashboard(owner)).spentTodayCents, 20);

    const awardOnly = randomUUID();
    await sql`INSERT INTO users(id) VALUES (${awardOnly})`;
    const awardQuote = await repo.createCreditQuote(awardOnly, '0x0000000000000000000000000000000000000003', 500);
    const awardTx = `0x${'d'.repeat(64)}`;
    await repo.confirmCreditPurchase(awardOnly, awardQuote.id, awardTx);
    await sql`UPDATE economy_accounts SET balance_cents=100 WHERE user_id=${awardOnly}`;
    await sql`INSERT INTO economy_entries(user_id,delta_cents,kind,reference) VALUES (${awardOnly},-500,'circle_pin',${randomUUID()}),(${awardOnly},100,'challenge_award',${randomUUID()})`;
    assert.equal((await repo.listCreditRefunds(awardOnly)).refundableCents, 0);
    await assert.rejects(() => repo.requestCreditRefund(awardOnly, awardTx, 100, 'Try refunding an earned award balance.'), /own purchases/);

    const research = loader({ [path.resolve('lib/news/provider.ts')]: { COMPANY_QUERIES: { NVDA: 'Nvidia' }, fetchCompanyNews: async () => ({ stale: false, checkedAt: Date.now(), articles: [1,2].map(id => ({ title: `Nvidia headline ${id}`, url: `https://example.org/${id}`, source: 'Example', seenAt: new Date().toISOString() })) }) } })('lib/economy/research.ts');
    assert.equal(research.supportedResearchSymbol('NVDA'), 'NVDA');
    assert.equal(research.supportedResearchSymbol('FAKE'), null);
    const sources = await research.loadResearchSources('NVDA');
    const oldFetch = global.fetch, oldKey = process.env.BANKR_LLM_KEY;
    try {
      process.env.BANKR_LLM_KEY = 'mock-key';
      const valid = { summary: { text: 'The headlines show recent Nvidia developments.', sources: [1] }, bull: [{ text: 'A supportive headline may support the case.', sources: [1] }], bear: [{ text: 'The other headline raises a counterpoint.', sources: [2] }], watch: [{ text: 'Watch for corroborating primary disclosures.', sources: [1,2] }] };
      global.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(valid) } }] }), { status: 200 });
      assert.equal((await research.generateResearchBrief('NVDA', sources)).sources.length, 2);
      global.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ...valid, summary: { ...valid.summary, sources: [99] } }) } }] }), { status: 200 });
      await assert.rejects(() => research.generateResearchBrief('NVDA', sources), /uncited/);
      global.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ...valid, summary: { ...valid.summary, sources: [1,99] } }) } }] }), { status: 200 });
      await assert.rejects(() => research.generateResearchBrief('NVDA', sources), /uncited/);
    } finally { global.fetch = oldFetch; if (oldKey === undefined) delete process.env.BANKR_LLM_KEY; else process.env.BANKR_LLM_KEY = oldKey; }
    console.log('ECONOMY_SERVICES_OK');
  } finally {
    if (sql) await sql.end();
    await root.unsafe(`DROP DATABASE IF EXISTS "${database}"`);
    await root.end();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
