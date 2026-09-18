const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = fs.readFileSync('public/llms.txt', 'utf8');
const guide = fs.readFileSync('public/agents/llms.txt', 'utf8');
const canonicalOpenApi = fs.readFileSync('docs/agents/openapi.yaml', 'utf8');
const publicOpenApi = fs.readFileSync('public/agents/openapi.yaml', 'utf8');

assert.equal(publicOpenApi, canonicalOpenApi, 'public OpenAPI must exactly match the canonical contract');

const routes = [
  '/api/v1/agents/capabilities',
  '/api/v1/agents/instruments',
  '/api/v1/agents/theses',
  '/api/v1/agents/theses/{id}',
  '/api/v1/agents/theses/{id}/activity',
  '/api/v1/agents/profiles/{publicId}',
  '/api/v1/agents/me',
  '/api/v1/agents/me/portfolio',
  '/api/v1/agents/me/limits',
  '/api/v1/agents/paper/theses',
  '/api/v1/agents/paper/quotes',
  '/api/v1/agents/paper/trades',
  '/api/v1/agents/requests/{idempotencyKey}',
];
for (const route of routes) assert(guide.includes(route), `agent guide missing ${route}`);

const requiredGuideTokens = [
  'modes.live: false',
  'paper-only',
  'db_agent_',
  'SHA-256',
  '`read`',
  '`paper:publish`',
  '`paper:trade`',
  'allowed-instrument',
  'daily gross-buy',
  'Idempotency-Key',
  'lost-response recovery',
  'RATE_LIMITED',
  'DaybreakAgentClient',
  'DAYBREAK_EXECUTE_PAPER=1',
  'Public visibility and privacy',
  '/api/v1/market/pairing-opportunities',
];
for (const token of requiredGuideTokens) assert(guide.includes(token), `agent guide missing ${token}`);
assert(guide.includes('Never send a wallet seed phrase or private key to Daybreak.'), 'guide must reject wallet secret collection');
console.log('agent llms verification passed');

const rootLinks = [
  'https://www.daybreakcircles.lol/agents/llms.txt',
  'https://www.daybreakcircles.lol/agents/openapi.yaml',
  'https://www.daybreakcircles.lol/api/v1/agents/capabilities',
  'https://github.com/ronkenx9/daybreak/blob/main/docs/agents/QUICKSTART.md',
  '/api/v1/market/pairing-opportunities',
  'PAYMENT-REQUIRED',
];
for (const token of rootLinks) assert(root.includes(token), `root llms.txt missing ${token}`);
console.log('root llms discovery verified');
