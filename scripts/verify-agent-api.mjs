import assert from 'node:assert/strict';
import fs from 'node:fs';

const required=[
  'app/api/v1/agents/capabilities/route.ts','app/api/v1/agents/instruments/route.ts','app/api/v1/agents/theses/route.ts','app/api/v1/agents/theses/[id]/route.ts','app/api/v1/agents/theses/[id]/activity/route.ts','app/api/v1/agents/profiles/[publicId]/route.ts','app/api/v1/agents/me/route.ts','app/api/v1/agents/me/portfolio/route.ts','app/api/v1/agents/me/limits/route.ts','app/api/v1/agents/paper/theses/route.ts','app/api/v1/agents/paper/quotes/route.ts','app/api/v1/agents/paper/trades/route.ts','app/api/v1/agents/requests/[idempotencyKey]/route.ts','app/api/me/agents/route.ts','components/daybreak/agents/AgentManager.tsx','app/paper/agents/[publicId]/page.tsx','docs/agents/openapi.yaml','docs/agents/QUICKSTART.md','packages/agent-sdk/index.mjs','packages/agent-sdk/index.d.ts','examples/paper-agent/index.mjs','drizzle/0022_agent_participation.sql'
];
for(const file of required)assert(fs.existsSync(file),`missing ${file}`);
const capabilities=fs.readFileSync(required[0],'utf8');assert(capabilities.includes("live: false"),'live capability must stay false');
const auth=fs.readFileSync('lib/agents/auth.ts','utf8');assert(auth.includes("AGENT_PAPER_API_ENABLED === '1'"),'paper writes must be feature flagged');
const sdk=fs.readFileSync('packages/agent-sdk/index.mjs','utf8');for(const token of ['idempotency-key','requestStatus','quotePaper','tradePaper'])assert(sdk.includes(token),`SDK missing ${token}`);
const example=fs.readFileSync('examples/paper-agent/index.mjs','utf8');assert(example.includes("DAYBREAK_EXECUTE_PAPER==='1'"),'example must default to dry run');assert(example.includes('requestStatus'),'example must recover durable requests');
const openapi=fs.readFileSync('docs/agents/openapi.yaml','utf8');for(const route of ['/api/v1/agents/capabilities:','/api/v1/agents/paper/trades:','/api/v1/agents/requests/{idempotencyKey}:'])assert(openapi.includes(route),`OpenAPI missing ${route}`);
console.log('agent API release surface verified');
