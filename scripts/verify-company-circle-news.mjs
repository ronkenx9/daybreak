import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const mode = process.argv[2];

if (mode === 'registry') {
  const registry = read('lib/assets/companies.ts');
  assert.match(registry, /classification:\s*'private'/);
  assert.match(registry, /companyId:\s*'openai'/);
  assert.match(registry, /identity:\s*'PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF'/);
  assert.match(registry, /newsProvider:\s*'prestocks'/);
  console.log('private company registry verification passed');
} else if (mode === 'solana') {
  const route = read('app/api/solana/holdings/sync/route.ts');
  const repo = read('lib/db/repo.ts');
  assert.match(route, /Promise\.allSettled/);
  assert.match(route, /readPreStockHoldings/);
  assert.match(route, /syncPreStockHoldingEligibility/);
  assert.match(repo, /export async function syncPreStockHoldingEligibility/);
  assert.match(repo, /chainNamespace = 'solana:prestocks:mainnet'/);
  console.log('unified Solana evidence verification passed');
} else if (mode === 'news') {
  const route = read('app/api/circles/news/route.ts');
  const comments = read('app/api/news/comments/route.ts');
  const identity = read('lib/news/url.ts');
  assert.match(route, /fetchPreStockNews/);
  assert.match(route, /newsProvider === 'prestocks'/);
  assert.match(comments, /companyForSymbol/);
  assert.match(identity, /\^\[A-Z0-9\]\{1,16\}\$/);
  console.log('company news routing verification passed');
} else {
  throw new Error('Usage: node scripts/verify-company-circle-news.mjs registry|solana|news');
}
