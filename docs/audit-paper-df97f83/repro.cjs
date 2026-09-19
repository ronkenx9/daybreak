const assert = require('node:assert/strict');
const fs = require('node:fs');
const { loader } = require('../../scripts/test-paper-behavior.cjs');

const repo = fs.readFileSync('lib/db/repo-theses.ts', 'utf8');
const schema = fs.readFileSync('lib/db/schema.ts', 'utf8');
const mode = fs.readFileSync('components/daybreak/theses/PaperTradingMode.tsx', 'utf8');
const guard = fs.readFileSync('lib/account/request-guard.ts', 'utf8');
const route = fs.readFileSync('app/api/theses/paper/[id]/trade/route.ts', 'utf8');

assert.match(schema, /visibility: text\('visibility'\)\.notNull\(\)\.default\('private'\)/);
assert.match(repo, /displayName: profiles\.displayName, avatar: profiles\.avatar, avatarUrl: profiles\.avatarUrl/);
assert.match(repo, /eq\(theses\.visibility, 'public'\)/);
assert.doesNotMatch(repo, /eq\(profiles\.visibility, 'public'\)/);
console.log('Confirmed: public paper responses ignore private profile visibility');

assert.match(mode, /creationAttempt=useRef/);
const paperCreation = mode.slice(mode.indexOf('const creationAttempt='), mode.indexOf('const preview='));
assert.doesNotMatch(paperCreation, /localStorage|sessionStorage/);
assert.match(paperCreation, /creationAttempt\.current=null/);
console.log('Confirmed: publication retry identity is lost on remount or stale success');

const paper = loader()('lib/theses/paper.ts');
const amount = 1e-11;
const quote = paper.quotePaperTrade({ baseReserve: 100_000, quoteReserve: 250 }, 'buy', amount);
assert.equal(Number(amount.toFixed(10)), 0);
assert(quote.outputAmount > 0);
assert.match(schema, /numeric\('input_amount', \{ precision: 30, scale: 10/);
assert.match(route, /amount <= 0 \|\| amount > 1_000_000/);
assert.match(guard, /createKeyedRateLimit/);
console.log('Confirmed: sub-scale positive inputs create positive quotes and pass route validation');

assert.match(repo, /orderBy\(asc\(positionIdentity\)\)/);
assert.match(repo, /orderBy\(asc\(balanceIdentity\)\)/);
assert.match(repo, /encode\(sha256\(convert_to\('daybreak-paper:' \|\|/);
assert.doesNotMatch(schema, /public_id/);
console.log('Confirmed: public identity lookup and ordering use unindexed hash expressions');

console.log('df97f83 audit reproductions passed');
