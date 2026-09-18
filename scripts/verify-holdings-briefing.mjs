import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';

function loader(overrides = {}) {
  const cache = {};
  function load(file) {
    file = path.resolve(file);
    if (file in overrides) return overrides[file];
    if (cache[file]) return cache[file].exports;
    const module = { exports: {} }; cache[file] = module;
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const req = (id) => {
      if (id === 'server-only') return {};
      if (id.startsWith('.') || id.startsWith('@/')) {
        const base = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(file), id);
        return load(`${base}.ts`);
      }
      return require(id);
    };
    new Function('require', 'module', 'exports', js)(req, module, module.exports);
    return module.exports;
  }
  return load;
}

const companies = {
  apple: { id: 'apple', symbol: 'AAPL', name: 'Apple', classification: 'public', newsProvider: 'finnhub' },
  openai: { id: 'openai', symbol: 'OPENAI', name: 'OpenAI', classification: 'private', newsProvider: 'prestocks' },
};
const targets = (symbols) => symbols.flatMap((symbol) => symbol === 'AAPL'
  ? [{ companyId: 'apple', symbol: 'AAPL', newsProvider: 'finnhub' }]
  : symbol === 'OPENAI' ? [{ companyId: 'openai', symbol: 'OPENAI', newsProvider: 'prestocks' }] : []);
const baseOverrides = {
  [path.resolve('lib/assets/companies.ts')]: { COMPANY_BY_ID: companies },
  [path.resolve('lib/news/company-routing.ts')]: { companyNewsTargets: targets },
};
const story = { title: 'Apple schedules product briefing', url: 'https://news.example/apple', source: 'Example Wire', seenAt: '2026-09-18T08:00:00.000Z', image: '' };
const service = loader({
  ...baseOverrides,
  [path.resolve('lib/news/provider.ts')]: { fetchCompanyNews: async () => ({ articles: [story, { ...story, url: 'https://syndicate.example/apple' }], stale: false }) },
  [path.resolve('lib/news/prestocks-news.ts')]: { fetchPreStockNews: async () => ({ items: [], stale: true }) },
  [path.resolve('lib/providers/xstocks.ts')]: { fetchCorporateActions: async () => ({ upcoming: [
    { eventId: 'split-1', version: 1, caType: 'Stock split', effectiveTimeUtc: '2026-10-01T12:00:00.000Z' },
    { eventId: 'split-1', version: 2, caType: 'Stock split', effectiveTimeUtc: '2026-10-02T12:00:00.000Z' },
  ] }) },
})('lib/briefing/service.ts');
const partial = await service.buildHoldingsBriefing(['AAPL', 'OPENAI'], Date.parse('2026-09-18T12:00:00.000Z'));
assert.equal(partial.state, 'partial');
assert.equal(partial.items[0].kind, 'corporate_action');
assert.equal(partial.items[0].revision, 2);
assert.equal(partial.items.filter((item) => item.kind === 'news').length, 1);
assert.equal(partial.coverage.unavailable, 1);
assert.match(partial.items[0].actionHref, /^\/app\?stock=AAPL/);

const unavailableService = loader({
  ...baseOverrides,
  [path.resolve('lib/news/provider.ts')]: { fetchCompanyNews: async () => { throw new Error('offline'); } },
  [path.resolve('lib/news/prestocks-news.ts')]: { fetchPreStockNews: async () => ({ items: [], stale: true }) },
  [path.resolve('lib/providers/xstocks.ts')]: { fetchCorporateActions: async () => null },
})('lib/briefing/service.ts');
assert.equal((await unavailableService.buildHoldingsBriefing(['AAPL'])).state, 'unavailable');
assert.equal((await unavailableService.buildHoldingsBriefing([])).state, 'empty_holdings');

const quietService = loader({
  ...baseOverrides,
  [path.resolve('lib/news/provider.ts')]: { fetchCompanyNews: async () => { throw new Error('unused'); } },
  [path.resolve('lib/news/prestocks-news.ts')]: { fetchPreStockNews: async () => ({ items: [], stale: false }) },
  [path.resolve('lib/providers/xstocks.ts')]: { fetchCorporateActions: async () => null },
})('lib/briefing/service.ts');
assert.equal((await quietService.buildHoldingsBriefing(['OPENAI'])).state, 'no_developments');

let required = 0; let serviceSymbols = null;
const route = loader({
  [path.resolve('lib/account/auth-server.ts')]: { requireUser: async () => { required++; return { id: 'account-a' }; }, errorResponse: () => Response.json({ error: 'x' }, { status: 500 }) },
  [path.resolve('lib/db/repo.ts')]: { listEligibleHoldingSymbols: async (id) => { assert.equal(id, 'account-a'); return ['AAPL']; } },
  [path.resolve('lib/briefing/service.ts')]: { buildHoldingsBriefing: async (symbols) => { serviceSymbols = symbols; return partial; } },
})('app/api/me/briefing/route.ts');
const response = await route.GET(new Request('https://daybreak.test/api/me/briefing'));
assert.equal(required, 1);
assert.deepEqual(serviceSymbols, ['AAPL']);
assert.equal(response.headers.get('cache-control'), 'private, no-store');

const repoSource = fs.readFileSync('lib/db/repo.ts', 'utf8');
assert.match(repoSource, /listEligibleHoldingSymbols[\s\S]*expiresAt[^\n]*> now\(\)/);
const ui = fs.readFileSync('components/daybreak/HoldingsBriefing.tsx', 'utf8');
for (const state of ['Building your briefing', 'Verify a holding to start', 'You’re caught up', 'sources are taking a pause', "state === 'partial'"]) assert.ok(ui.includes(state), `missing UI state: ${state}`);
assert.match(ui, /items\.slice\(0, 3\)/);
assert.match(ui, /Show all/);
const circles = fs.readFileSync('components/daybreak/CirclesHub.tsx', 'utf8');
assert.match(circles, /params\.get\('circle'\)/);
assert.match(circles, /initialStoryUrl/);

console.log('holdings briefing verification passed');
