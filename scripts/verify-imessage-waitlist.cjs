const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function loader(overrides = {}) {
  const cache = {};
  function load(file) {
    file = path.resolve(file);
    if (file in overrides) return overrides[file];
    if (cache[file]) return cache[file].exports;
    const module = { exports: {} };
    cache[file] = module;
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (id) => {
      if (id === 'server-only') return {};
      if (id.startsWith('@/')) return load(path.join(root, `${id.slice(2)}.ts`));
      if (id.startsWith('.')) return load(path.join(path.dirname(file), `${id}.ts`));
      return require(id);
    };
    new Function('require', 'module', 'exports', output)(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}

(async () => {
  const waitlist = loader()(path.join(root, 'lib/imessage/waitlist.ts'));
  assert.equal(waitlist.normalizeImessagePhone('+1 (415) 555-0142'), '+14155550142');
  assert.equal(waitlist.normalizeImessagePhone('0044 20 7946 0958'), '+442079460958');
  for (const bad of ['', '4155550142', '+012345678', '+123', '+1234567890123456', 'hello']) {
    assert.equal(waitlist.normalizeImessagePhone(bad), null, `accepted invalid phone: ${bad}`);
  }
  assert.equal(waitlist.maskImessagePhone('+14155550142'), '•••• 0142');

  class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
  let joins = 0;
  const overrides = {
    [path.join(root, 'lib/account/auth-server.ts')]: {
      HttpError,
      readJsonObject: async (request) => JSON.parse(await request.text()),
      errorResponse: (error) => Response.json({ error: error.message }, { status: error.status || 500 }),
    },
    [path.join(root, 'lib/db/client.ts')]: { isDbConfigured: true },
    [path.join(root, 'lib/db/repo-imessage-waitlist.ts')]: {
      joinImessageWaitlist: async (phone) => { joins += 1; assert.equal(phone, '+14155550142'); return { status: 'waiting' }; },
    },
    [path.join(root, 'lib/server/requests.ts')]: { createKeyedRateLimit: () => () => true },
  };
  const route = loader(overrides)(path.join(root, 'app/api/imessage/waitlist/route.ts'));
  const request = (body) => new Request('https://daybreak.test/api/imessage/waitlist', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const missingConsent = await route.POST(request({ phone: '+1 415 555 0142', consent: false }));
  assert.equal(missingConsent.status, 400);
  assert.equal(missingConsent.headers.get('cache-control'), 'private, no-store');
  const invalid = await route.POST(request({ phone: '4155550142', consent: true }));
  assert.equal(invalid.status, 400);
  const trap = await route.POST(request({ phone: '+1 415 555 0142', consent: true, company: 'spam' }));
  assert.equal(trap.status, 200);
  assert.equal(trap.headers.get('cache-control'), 'private, no-store');
  assert.equal(joins, 0);
  const joined = await route.POST(request({ phone: '+1 (415) 555-0142', consent: true }));
  assert.equal(joined.status, 201);
  assert.equal(joined.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(await joined.json(), { joined: true, status: 'waiting', phone: '•••• 0142' });
  assert.equal(joins, 1);

  const schema = read('lib/db/schema.ts');
  const migration = read('drizzle/0026_imessage_waitlist.sql');
  const repo = read('lib/db/repo-imessage-waitlist.ts');
  const component = read('components/daybreak/ImessageWaitlist.tsx');
  const css = read('app/daybreak.css');
  const landing = read('app/page.tsx');
  assert.match(schema, /imessageWaitlist/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "imessage_waitlist"/);
  assert.match(migration, /UNIQUE/);
  assert.match(repo, /onConflictDoUpdate/);
  assert.match(component, /CharacterCrew/);
  assert.match(component, /IMESSAGE_WAITLIST_CONSENT/);
  assert.match(component, /aria-live="polite"/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(landing, /href="\/imessage"/);
  console.log('imessage waitlist verification passed');
})().catch((error) => { console.error(error); process.exit(1); });
