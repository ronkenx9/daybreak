const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const cache = new Map();
function loadSource(relative) {
  const file = path.join(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const instance = new Module(file, module);
  cache.set(file, instance);
  instance.filename = file;
  instance.paths = Module._nodeModulePaths(path.dirname(file));
  const originalRequire = instance.require.bind(instance);
  instance.require = (id) => id.startsWith('@/') ? loadSource(`${id.slice(2)}.ts`) : originalRequire(id);
  instance._compile(compiled, file);
  return instance.exports;
}

const { thesisCompanyId, companyThesesForTicker } = loadSource('lib/theses/company-journey.ts');
assert.equal(thesisCompanyId('NVDA'), 'nvidia');
assert.equal(thesisCompanyId('googl'), 'alphabet');
assert.equal(thesisCompanyId('MSTR'), 'microstrategy');
assert.equal(thesisCompanyId('CRCL'), null);
assert.equal(thesisCompanyId('SPCX'), null);
assert.equal(thesisCompanyId('FAKE'), null);
const items = [
  { id: 'other', companyId: 'apple' },
  { id: 'nvidia-1', companyId: 'nvidia' },
  { id: 'similar', companyId: 'nvidia-competitor' },
  { id: 'nvidia-2', companyId: 'nvidia' },
];
assert.deepEqual(companyThesesForTicker('NVDA', items).map(item => item.id), ['nvidia-1', 'nvidia-2']);
assert.deepEqual(companyThesesForTicker('NVDA', items, 1).map(item => item.id), ['nvidia-1']);
assert.deepEqual(companyThesesForTicker('CRCL', items), []);
console.log('company journey checks passed');
