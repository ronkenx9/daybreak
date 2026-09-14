import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = process.cwd();

function source(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function loader(overrides = {}) {
  const cache = {};
  function load(file) {
    file = path.resolve(root, file);
    if (file in overrides) return overrides[file];
    if (cache[file]) return cache[file].exports;
    const module = { exports: {} };
    cache[file] = module;
    const javascript = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const localRequire = (id) => {
      if (id in overrides) return overrides[id];
      if (id === 'server-only') return {};
      if (id.startsWith('@/')) return load(`${id.slice(2)}.ts`);
      if (id.startsWith('.')) return load(`${path.relative(root, path.resolve(path.dirname(file), id))}.ts`);
      return require(id);
    };
    new Function('require', 'module', 'exports', javascript)(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}

function fakeGateway() {
  return {
    require: () => async (request, response, next) => {
      if (!request.headers['payment-signature']) {
        response.statusCode = 402;
        response.setHeader('PAYMENT-REQUIRED', Buffer.from(JSON.stringify({ x402Version: 2, accepts: [{ network: 'eip155:8453' }] })).toString('base64'));
        response.end('{}');
        return;
      }
      request.payment = { verified: true, payer: '0x0000000000000000000000000000000000000002', amount: '5000', network: 'eip155:8453', transaction: '0xpaid' };
      response.setHeader('PAYMENT-RESPONSE', 'settled');
      next();
    },
  };
}

async function verifyX402() {
  const gatewaySource = source('lib/x402/gateway.ts');
  assert.match(gatewaySource, /@circle-fin\/x402-batching\/server/);
  assert.match(gatewaySource, /gateway\.require\(X402_PRICE_USD\)/);
  assert.match(gatewaySource, /DAYBREAK_X402_SELLER_ADDRESS/);
  assert.match(gatewaySource, /X402_FACILITATOR_UNAVAILABLE/);
  const load = loader({
    '@circle-fin/x402-batching/server': { createGatewayMiddleware: fakeGateway },
    viem: { isAddress: (value) => /^0x[0-9a-f]{40}$/i.test(value) },
  });
  const gateway = load('lib/x402/gateway.ts');
  process.env.DAYBREAK_X402_SELLER_ADDRESS = '0x0000000000000000000000000000000000000001';
  const unpaid = await gateway.requirePairingPayment(new Request('https://daybreak.test/api/v1/market/pairing-opportunities'));
  assert.equal(unpaid.response.status, 402);
  assert.equal(JSON.parse(Buffer.from(unpaid.response.headers.get('PAYMENT-REQUIRED'), 'base64').toString()).x402Version, 2);
  const paid = await gateway.requirePairingPayment(new Request('https://daybreak.test/api/v1/market/pairing-opportunities', { headers: { 'PAYMENT-SIGNATURE': 'signed' } }));
  assert.equal(paid.response, undefined);
  assert.equal(paid.payment.amount, '5000');
  assert.equal(paid.paymentResponseHeader, 'settled');
  delete process.env.DAYBREAK_X402_SELLER_ADDRESS;
  console.log('x402 verification passed');
}

async function verifyData() {
  const stocks = [
    { ticker: 'NVDA', onchainSymbol: 'NVDAc', name: 'NVIDIA', token: '0xstock1' },
    { ticker: 'AAPL', onchainSymbol: 'AAPLc', name: 'Apple', token: '0xstock2' },
  ];
  const load = loader({
    [path.join(root, 'lib/base/memecoins.ts')]: { fetchMemeTokens: async () => [] },
    [path.join(root, 'lib/base/tokens.ts')]: { TOKENS: stocks },
  });
  const data = load('lib/data/pairing-opportunities.ts');
  assert.throws(() => data.parsePairingQuery('https://daybreak.test/?limit=26'));
  assert.throws(() => data.parsePairingQuery('https://daybreak.test/?minLiquidity=4999'));
  const row = {
    parentTicker: 'NVDA', parentSymbol: 'NVDAc', symbol: 'DAYC', name: 'Daybreak', address: '0xmeme',
    liquidityUsd: 50_000, volume24Usd: 80_000, txns24: 200, change: { h1: 1, h6: 2, h24: 25 },
    volume: { h1: 1, h6: 2, h24: 80_000 }, ageMs: 3_600_000, pairAddress: '0xpool', url: 'https://dexscreener.com/base/pool',
  };
  const result = data.buildPairingIntelligence([row], stocks, { minLiquidity: 5_000, limit: 10, window: '24h' }, new Date('2026-09-14T00:00:00Z'));
  assert.equal(result.opportunities.length, 1);
  assert.ok(result.opportunities[0].score > 0 && result.opportunities[0].score <= 100);
  assert.equal(result.coverage.find((item) => item.ticker === 'AAPL').status, 'unpaired');
  assert.deepEqual(result.overlookedStocks, ['AAPL']);
  assert.ok(result.provenance.length >= 3);
  assert.ok(result.caveats.some((item) => /not investment/i.test(item)));
  console.log('pairing data verification passed');
}

function verifySeo() {
  const layout = source('app/layout.tsx');
  for (const marker of ['alternates:', 'openGraph:', 'twitter:', 'application/ld+json', 'manifest:']) assert.match(layout, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(source('app/robots.ts'), /sitemap/);
  assert.match(source('app/sitemap.ts'), /\/thesis/);
  assert.match(source('app/manifest.ts'), /start_url/);
  assert.match(source('app/opengraph-image.tsx'), /1200/);
  assert.match(source('app/app/layout.tsx'), /index: false/);
  const llms = source('public/llms.txt');
  assert.match(llms, /pairing-opportunities/);
  assert.match(llms, /PAYMENT-REQUIRED/);
  console.log('seo verification passed');
}

const target = process.argv[2];
if (target === 'x402') await verifyX402();
else if (target === 'data') await verifyData();
else if (target === 'seo') verifySeo();
else throw new Error('Usage: node scripts/verify-x402-seo.mjs <x402|data|seo>');
