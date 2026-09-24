// Isolated localhost database only (127.0.0.1:55439). Never reads DATABASE_URL or production data.
// Verifies who can resolve whom as a stock-send recipient inside circles, and that member
// listings never expose wallet addresses.
const { loader } = require('./test-paper-behavior.cjs');
const postgres = require('postgres'), { drizzle } = require('drizzle-orm/postgres-js'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), { randomUUID } = require('node:crypto');

(async () => {
  const user = encodeURIComponent(require('node:os').userInfo().username);
  const name = 'circle_send_test_' + randomUUID().replaceAll('-', '');
  const root = postgres(`postgres://${user}@127.0.0.1:55439/postgres`, { max: 1, onnotice: () => {} });
  let sql;
  try {
    await root.unsafe(`CREATE DATABASE "${name}"`);
    sql = postgres(`postgres://${user}@127.0.0.1:55439/${name}`, { max: 4, onnotice: () => {} });
    for (const role of ['anon', 'authenticated']) await root.unsafe(`DO $$ BEGIN CREATE ROLE ${role}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    for (const file of fs.readdirSync('drizzle').filter((f) => f.endsWith('.sql')).sort()) await sql.unsafe(fs.readFileSync(path.join('drizzle', file), 'utf8').replaceAll('--> statement-breakpoint', ''));
    const schema = loader()('lib/db/schema.ts'), db = drizzle(sql, { schema });
    const mocks = { [path.resolve('lib/db/client.ts')]: { getDb: () => db } };
    const load = loader(mocks);
    const repo = load('lib/db/repo.ts'), send = load('lib/db/repo-send.ts');

    const [alice, bob, carol] = [randomUUID(), randomUUID(), randomUUID()];
    await sql`insert into users(id, privy_did) values (${alice}, ${'did:a:' + alice}), (${bob}, ${'did:b:' + bob}), (${carol}, ${'did:c:' + carol})`;
    await sql`insert into profiles(user_id, display_name, handle) values (${alice}, 'Alice', 'alice'), (${bob}, 'Bob', 'bob'), (${carol}, 'Carol', 'carol')`;
    const [circle] = await sql`insert into circles(slug, name, gate_mode) values ('send-test', 'Send test', 'open') returning id`;
    await sql`insert into circle_memberships(circle_id, user_id) values (${circle.id}, ${alice}), (${circle.id}, ${bob})`;

    // Member list: opaque refs and flags, never addresses.
    let list = await repo.listCircleMembers(alice, 'send-test');
    assert.equal(list.ok, true);
    const bobRow = list.members.find((m) => m.displayName === 'Bob'), aliceRow = list.members.find((m) => m.displayName === 'Alice');
    assert.ok(/^[0-9a-f-]{36}$/.test(bobRow.memberRef));
    assert.equal(aliceRow.isYou, true); assert.equal(bobRow.isYou, false);
    assert.equal(bobRow.canReceive, false);
    assert.ok(!JSON.stringify(list).match(/0x[0-9a-f]{40}|address|userId/i), 'member list must not expose wallets or user ids');

    // Not opted in: no address.
    assert.deepEqual(await send.resolveSendTarget(alice, 'send-test', bobRow.memberRef), { ok: false, reason: 'not_receiving' });

    // Opt in (verified wallet supplied by the server route), then resolvable by a fellow member.
    const bobWallet = '0xAbCdEf0000000000000000000000000000001234';
    assert.equal(await send.setReceiveOptIn(bob, bobWallet, true), true);
    assert.equal(await send.getReceiveOptIn(bob), true);
    const ok = await send.resolveSendTarget(alice, 'send-test', bobRow.memberRef);
    assert.deepEqual(ok, { ok: true, address: bobWallet.toLowerCase(), displayName: 'Bob', handle: 'bob' });
    list = await repo.listCircleMembers(alice, 'send-test');
    assert.equal(list.members.find((m) => m.displayName === 'Bob').canReceive, true);
    assert.ok(!JSON.stringify(list).match(/0x[0-9a-f]{40}/i), 'member list must still not expose the opted-in wallet');

    // Outsiders, self-sends, departed members and opt-outs are all refused.
    assert.deepEqual(await send.resolveSendTarget(carol, 'send-test', bobRow.memberRef), { ok: false, reason: 'membership' });
    assert.deepEqual(await send.resolveSendTarget(alice, 'send-test', aliceRow.memberRef), { ok: false, reason: 'self' });
    assert.deepEqual(await send.resolveSendTarget(alice, 'send-test', randomUUID()), { ok: false, reason: 'missing' });
    // A membership ref from another circle does not resolve here.
    const [other] = await sql`insert into circles(slug, name, gate_mode) values ('other', 'Other', 'open') returning id`;
    const [carolOther] = await sql`insert into circle_memberships(circle_id, user_id) values (${other.id}, ${carol}) returning id`;
    await send.setReceiveOptIn(carol, '0x1111111111111111111111111111111111111111', true);
    assert.deepEqual(await send.resolveSendTarget(alice, 'send-test', carolOther.id), { ok: false, reason: 'missing' });

    // Switching wallets keeps exactly one opted-in EVM wallet.
    await send.setReceiveOptIn(bob, '0x2222222222222222222222222222222222222222', true);
    assert.equal((await send.resolveSendTarget(alice, 'send-test', bobRow.memberRef)).address, '0x2222222222222222222222222222222222222222');
    assert.equal(Number((await sql`select count(*) as n from linked_wallets where user_id=${bob} and namespace='eip155' and visibility='circles'`)[0].n), 1);

    await send.setReceiveOptIn(bob, '0x2222222222222222222222222222222222222222', false);
    assert.equal(await send.getReceiveOptIn(bob), false);
    assert.deepEqual(await send.resolveSendTarget(alice, 'send-test', bobRow.memberRef), { ok: false, reason: 'not_receiving' });

    await sql`update circle_memberships set status='left' where user_id=${bob}`;
    assert.deepEqual(await send.resolveSendTarget(alice, 'send-test', bobRow.memberRef), { ok: false, reason: 'missing' });
    console.log('circle send database tests passed');
  } finally {
    if (sql) await sql.end();
    await root.unsafe(`DROP DATABASE IF EXISTS "${name}"`).catch(() => {});
    await root.end();
  }
})().catch((error) => { console.error(error); process.exit(1); });
