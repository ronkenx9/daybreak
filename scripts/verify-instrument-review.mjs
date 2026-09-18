import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';

function load(file, cache = {}) {
  file = path.resolve(file);
  if (cache[file]) return cache[file].exports;
  const module = { exports: {} }; cache[file] = module;
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const req = (id) => {
    if (id === 'server-only') return {};
    if (id.startsWith('.') || id.startsWith('@/')) {
      const base = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(file), id);
      return load(`${base}.ts`, cache);
    }
    throw new Error(`Unexpected dependency: ${id}`);
  };
  new Function('require', 'module', 'exports', js)(req, module, module.exports);
  return module.exports;
}

const model = load('lib/trading/model.ts');
const apple = model.tradeInstrumentsForTicker('AAPL');
assert.equal(apple.length, 2);
assert.deepEqual(apple.map((item) => item.network), ['eip155:8453', 'solana:mainnet']);
assert.equal(apple[0].identity.toLowerCase(), '0xb200000000000000000000c2e324d24d7eecd1fb');
assert.equal(apple[1].identity, 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp');
assert.notEqual(apple[0].instrumentId, apple[1].instrumentId);
assert.equal(apple[0].funding.symbol, 'USDC');
assert.equal(apple[1].funding.symbol, 'USDC');
assert.equal(model.tradeInstrumentsForTicker('SPCX').length, 1);
assert.equal(model.tradeInstrumentsForTicker('FAKE').length, 0);
assert.equal(model.decimalToRaw('25.50', 6), '25500000');
assert.equal(model.decimalToRaw('1.0000001', 6), null);
assert.equal(model.rawToDecimal('123456789', 8), '1.23456789');

const ui = fs.readFileSync('components/daybreak/InstrumentComparison.tsx', 'utf8');
for (const marker of ['Choose the exact asset', 'Compare instruments', 'Linked wallet ready', 'Review only · no transaction created', 'Provider expiry', 'instrumentId !== selected.instrumentId']) assert.ok(ui.includes(marker), `missing UI contract: ${marker}`);
assert.match(ui, /account\.solanaWallet/);
assert.match(ui, /account\.user\?\.wallet/);
assert.match(ui, /Open independent Uniswap route/);
assert.doesNotMatch(ui, /\bsignTransaction\b|\bsendTransaction\b|\/execute\b/);
const stockDetails = fs.readFileSync('components/daybreak/StockDetails.tsx', 'utf8');
assert.match(stockDetails, /InstrumentComparison/);
assert.doesNotMatch(stockDetails, /TradeSheet|SolanaSwapQuote/);
const baseRoute = fs.readFileSync('app/api/trades/quote/route.ts', 'utf8');
const solanaRoute = fs.readFileSync('app/api/solana/swap-quote/route.ts', 'utf8');
for (const source of [baseRoute, solanaRoute]) {
  for (const field of ['contractVersion', 'companyId', 'instrumentId', 'providerQuoteId', 'expectedOutput', 'minimumOutput', 'quotedAt', 'expiresAt', 'execution']) assert.ok(source.includes(field), `missing quote field: ${field}`);
  assert.match(source, /Cache-Control': 'no-store/);
}

console.log('instrument review verification passed');
