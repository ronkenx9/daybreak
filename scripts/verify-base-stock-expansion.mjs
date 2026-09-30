import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = process.cwd();
const require = createRequire(import.meta.url);

function loadTypescript(file) {
  const filename = path.join(root, file);
  const module = { exports: {} };
  const javascript = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(javascript, { module, exports: module.exports, require, URL }, { filename });
  return module.exports;
}

const registry = loadTypescript('lib/base/tokens.ts');
const expectedOriginal = ['AAPL','AMZN','GOOGL','NVDA','TSLA','META','MSFT','MSTR','SNDK','SPCX'];
const expectedNew = ['MU','PLTR','AMD','RDDT','NFLX','ORCL','TTWO','MRNA','GME','LLY','BE','MRVL','DJT','RBLX','AVGO','PYPL','ASTS','QUBT','HTZ','DKNG','WEN','DUOL','NVAX','PFE','SOUN','PTON','PM','CAKE'];
const expected = [...expectedOriginal, ...expectedNew];
const actual = registry.TOKENS.map((token) => token.ticker);

assert.deepEqual([...actual].sort(), [...expected].sort(), 'catalog must contain the complete 38-stock supplied cohort');
assert.equal(new Set(actual).size, actual.length, 'tickers must be unique');
assert.equal(new Set(registry.TOKENS.map((token) => token.token.toLowerCase())).size, actual.length, 'contract addresses must be unique');
for (const token of registry.TOKENS) {
  assert.match(token.token, /^0xb200[0-9a-f]{36}$/i, `${token.ticker} must use a B20 address`);
  assert.equal(token.onchainSymbol, `${token.ticker}c`);
  assert.equal(token.decimals, 8);
  assert.equal(token.verified, true);
  assert.equal(typeof token.tradeable, 'boolean');
  const buy = new URL(registry.buyUrl(token));
  assert.equal(buy.hostname, 'app.uniswap.org');
  assert.equal(buy.searchParams.get('outputCurrency')?.toLowerCase(), token.token.toLowerCase());
}
for (const ticker of ['COIN','CRCL','INTC']) assert.equal(actual.includes(ticker), false, `${ticker} has zero issued supply and must not appear live`);
assert.equal(registry.TOKENS.filter((token) => token.feed).length, 10, 'only Base-documented feed addresses belong in the onchain feed set');
assert.equal(registry.TOKENS.filter((token) => !token.tradeable).length, 8, 'minted names without a verified market must remain visibly distinguished');
assert.equal(registry.REGISTRY_CHECKED_AT, '2026-09-30');

const prices = fs.readFileSync(path.join(root, 'lib/base/prices.ts'), 'utf8');
assert.match(prices, /readCoinbaseStockCatalog/);
assert.match(prices, /TOKENS\.filter\(t=>!t\.feed\)/);
const cards = fs.readFileSync(path.join(root, 'components/daybreak/StockCards.tsx'), 'utf8');
assert.match(cards, /Minted · pool pending/);
assert.match(cards, /Coinbase NAV/);
const news = fs.readFileSync(path.join(root, 'lib/news/provider.ts'), 'utf8');
assert.match(news, /TOKENS\.map\(\(token\) => \[token\.ticker, token\.name\]\)/, 'Base stock catalog must feed company news support');
const details = fs.readFileSync(path.join(root, 'components/daybreak/StockDetails.tsx'), 'utf8');
assert.match(details, /isXstockTicker/, 'xStocks-only panels must be gated for Base-only additions');

const poster = fs.readFileSync(path.join(root, 'public/assets/posters/base-stocks-wave-2026-09-30.png'));
assert.equal(poster.subarray(1, 4).toString(), 'PNG');
assert.equal(poster.readUInt32BE(16), 1122);
assert.equal(poster.readUInt32BE(20), 1402);

console.log('base stock expansion verification passed');
