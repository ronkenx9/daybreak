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
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const req = (id) => {
      if (id === 'server-only') return {};
      if (id.startsWith('.') || id.startsWith('@/')) {
        const base = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(file), id);
        for (const extension of ['.ts', '.tsx']) if (fs.existsSync(`${base}${extension}`)) return load(`${base}${extension}`);
      }
      return require(id);
    };
    new Function('require', 'module', 'exports', js)(req, module, module.exports);
    return module.exports;
  }
  return load;
}

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const auth = {
  HttpError,
  requireUser: async () => ({ id: 'user-a' }),
  errorResponse: (error) => Response.json({ error: error.message }, { status: error.status ?? 500 }),
};
const newsRoute = loader({
  [path.resolve('lib/account/auth-server.ts')]: auth,
  [path.resolve('lib/db/repo.ts')]: { circleNewsAccess: async () => ({ ok: true, tickers: ['AAPL', 'NVDA'] }) },
  [path.resolve('lib/news/company-routing.ts')]: { companyNewsTargets: () => [
    { companyId: 'apple', symbol: 'AAPL', newsProvider: 'finnhub' },
    { companyId: 'nvidia', symbol: 'NVDA', newsProvider: 'finnhub' },
  ] },
  [path.resolve('lib/news/provider.ts')]: { fetchCompanyNews: async (ticker) => {
    if (ticker === 'NVDA') throw new Error('provider offline');
    return { ticker, articles: [{ title: 'Apple update', url: 'https://news.example/aapl', source: 'Wire', seenAt: '2026-09-18T10:00:00.000Z' }], checkedAt: 1, stale: false };
  } },
  [path.resolve('lib/news/prestocks-news.ts')]: { fetchPreStockNews: async () => ({ items: [], stale: false }) },
  [path.resolve('lib/server/requests.ts')]: { createRequestCache: () => async (_key, load) => load() },
})('app/api/circles/news/route.ts');
const newsResponse = await newsRoute.GET(new Request('https://daybreak.test/api/circles/news?slug=holders-tech'));
assert.equal(newsResponse.status, 200);
const newsBody = await newsResponse.json();
assert.equal(newsBody.items.length, 1);
assert.equal(newsBody.stale, true);
assert.deepEqual(newsBody.coverage, { companies: 2, available: 1, unavailable: ['NVDA'] });

let deployed = false;
const launchRoute = loader({
  [path.resolve('lib/account/auth-server.ts')]: {
    HttpError,
    requireUserWithWallet: async () => ({ user: { id: 'user-a' }, walletAddress: '0xwallet' }),
    readJsonObject: async () => ({ idempotencyKey: '00000000-0000-0000-0000-000000000000', fingerprint: 'a'.repeat(64) }),
    errorResponse: auth.errorResponse,
  },
  [path.resolve('lib/account/request-guard.ts')]: { requireWriteCapacity: () => {} },
  [path.resolve('lib/bankr/client.ts')]: { BankrHttpError: class extends Error {}, deployToken: async () => { deployed = true; return {}; } },
  [path.resolve('lib/bankr/config.ts')]: { isBankrConfigured: true },
  [path.resolve('lib/bankr/launches.ts')]: { normalizeLaunchIntent: () => ({ ticker: 'AAPL' }), launchHash: () => 'intent', bankrLaunchRequest: () => ({}) },
  [path.resolve('lib/db/repo.ts')]: {
    getLaunchIntent: async () => ({ operationId: 'op', launchId: 'launch', operationStatus: 'quoted', intentHash: 'intent', fingerprint: 'a'.repeat(64) }),
    claimLaunchForDeployment: async (operationId, launchId, userId) => {
      assert.deepEqual([operationId, launchId, userId], ['op', 'launch', 'user-a']);
      return 'limit';
    },
    setLaunchStatus: async () => {},
  },
})('app/api/token-launches/route.ts');
const launchResponse = await launchRoute.POST(new Request('https://daybreak.test/api/token-launches', { method: 'POST' }));
assert.equal(launchResponse.status, 429);
assert.equal(deployed, false);

const repo = fs.readFileSync('lib/db/repo.ts', 'utf8');
assert.match(repo, /pg_advisory_xact_lock\(hashtextextended/);
assert.match(repo, /updatedAt[^\n]*now\(\) - interval '24 hours'/);
const launch = fs.readFileSync('app/api/token-launches/route.ts', 'utf8');
assert.doesNotMatch(launch, /createKeyedRateLimit|canDeploy/);
const circleUi = fs.readFileSync('components/daybreak/CircleNews.tsx', 'utf8');
assert.match(circleUi, /coverage\.unavailable/);
assert.match(circleUi, /Showing available stories/);
const dialog = fs.readFileSync('components/daybreak/Dialog.tsx', 'utf8');
assert.match(dialog, /dialogStack/);
assert.match(dialog, /if\(!isTopDialog\(id\.current\)\)return/);
assert.match(dialog, /savedBodyOverflow/);
const guide = fs.readFileSync('components/daybreak/WelcomeGuide.tsx', 'utf8');
const css = fs.readFileSync('app/daybreak.css', 'utf8');
assert.match(guide, /db-guide-briefing-copy/);
assert.match(css, />\.db-token\{flex:none\}/);

console.log('audit fixes verification passed');
