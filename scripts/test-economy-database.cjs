// Isolated localhost database. This test never reads DATABASE_URL or live funds.
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
  const database = `economy_test_${randomUUID().replaceAll('-', '')}`;
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
    const sponsor = randomUUID(), contributor = randomUUID(), concurrent = randomUUID();
    const circleId = randomUUID();
    await sql`INSERT INTO users(id) VALUES (${sponsor}), (${contributor}), (${concurrent})`;
    await sql`INSERT INTO circles(id,slug,creator_user_id) VALUES (${circleId},'test-circle',${sponsor})`;
    await sql`INSERT INTO circle_memberships(circle_id,user_id) VALUES (${circleId},${contributor}), (${circleId},${concurrent})`;

    const quote = await repo.createCreditQuote(sponsor, '0x0000000000000000000000000000000000000001', 500);
    const tx = `0x${'a'.repeat(64)}`;
    assert.equal((await repo.confirmCreditPurchase(sponsor, quote.id, tx)).credited, true);
    assert.equal((await repo.confirmCreditPurchase(sponsor, quote.id, tx)).credited, false);
    assert.equal((await repo.getEconomyAccount(sponsor)).balanceCents, 500);
    const secondQuote = await repo.createCreditQuote(sponsor, '0x0000000000000000000000000000000000000001', 500);
    await assert.rejects(() => repo.confirmCreditPurchase(sponsor, secondQuote.id, tx), /already used/);
    assert.equal((await repo.getEconomyAccount(sponsor)).balanceCents, 500);

    const firstPin = await repo.pinCircleWithCredits(sponsor, 'test-circle', 'pin-one');
    assert.equal((await repo.pinCircleWithCredits(sponsor, 'test-circle', 'pin-one')).alreadyApplied, true);
    const secondPin = await repo.pinCircleWithCredits(sponsor, 'test-circle', 'pin-two');
    assert(Date.parse(secondPin.pinnedUntil) >= Date.parse(firstPin.pinnedUntil) + 47 * 3_600_000);
    assert.equal((await repo.getEconomyAccount(sponsor)).balanceCents, 450);
    assert.equal(Number((await sql`SELECT count(*) AS n FROM circle_pins`)[0].n), 2);

    const challengeInput = { title: 'Investigate Nvidia revenue quality', brief: 'Compare recent evidence and both sides of the revenue-quality case.', criteria: 'Cite primary sources and name a falsifying signal.', budgetCents: 200, deadline: new Date(Date.now() + 7 * 86_400_000), idempotencyKey: 'research-one' };
    const challenge = await repo.createChallenge(sponsor, 'test-circle', challengeInput);
    assert.equal((await repo.createChallenge(sponsor, 'test-circle', challengeInput)).id, challenge.id);
    assert.equal((await repo.getEconomyAccount(sponsor)).balanceCents, 250);
    const submission = await repo.submitChallenge(contributor, challenge.id, 'https://example.org/research', 'Evidence is mixed; customer concentration is the main invalidation risk.');
    await assert.rejects(() => repo.cancelEmptyChallenge(sponsor, challenge.id), /requires review/);
    await repo.awardChallenge(sponsor, challenge.id, submission.id);
    assert.equal((await repo.awardChallenge(sponsor, challenge.id, submission.id)).alreadyApplied, true);
    assert.equal((await repo.getEconomyAccount(contributor)).balanceCents, 200);
    assert.equal((await repo.getEconomyAccount(sponsor)).balanceCents, 250);

    const refundable = await repo.createChallenge(sponsor, 'test-circle', { ...challengeInput, budgetCents: 100, idempotencyKey: 'research-two' });
    assert.equal((await repo.cancelEmptyChallenge(sponsor, refundable.id)).refundedCents, 100);
    assert.equal((await repo.getEconomyAccount(sponsor)).balanceCents, 250);
    assert.equal((await repo.cancelEmptyChallenge(sponsor, refundable.id)).alreadyApplied, true);

    await sql`INSERT INTO economy_accounts(user_id,balance_cents) VALUES (${concurrent},25)`;
    const racing = await Promise.allSettled([
      repo.pinCircleWithCredits(concurrent, 'test-circle', 'race-one'),
      repo.pinCircleWithCredits(concurrent, 'test-circle', 'race-two'),
    ]);
    assert.equal(racing.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await repo.getEconomyAccount(concurrent)).balanceCents, 0);
    const stats = await repo.economyPublicStats();
    assert.equal(stats.creditsPurchasedCents, 500);
    assert.equal(stats.servicesDeliveredCents, 75);
    assert.equal(stats.openChallengeCents, 0);
    assert.equal(stats.creditsAwardedCents, 200);
    console.log('ECONOMY_LEDGER_OK');
  } finally {
    if (sql) await sql.end();
    await root.unsafe(`DROP DATABASE IF EXISTS "${database}"`);
    await root.end();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
