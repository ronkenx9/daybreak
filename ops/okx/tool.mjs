#!/usr/bin/env node
// Thin A2A runtime bridge. Reads one JSON tool call from stdin; keeps the scoped
// Daybreak key out of task messages, command arguments and delivered artifacts.
const origin = process.env.DAYBREAK_ORIGIN || 'https://www.daybreakcircles.lol';
const endpoint = new URL('/api/okx/tools', origin);
if (!['https:', 'http:'].includes(endpoint.protocol) || (endpoint.protocol === 'http:' && !['localhost','127.0.0.1'].includes(endpoint.hostname))) {
  console.error('DAYBREAK_ORIGIN must be HTTPS or local development'); process.exit(2);
}
let input;
try {
  const parts=[];
  for await (const part of process.stdin) parts.push(part);
  const raw=Buffer.concat(parts).toString('utf8');
  if (Buffer.byteLength(raw)>12_288) throw Error('Input too large');
  input=JSON.parse(raw);
  if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.tool !== 'string' || !input.arguments || typeof input.arguments !== 'object' || Array.isArray(input.arguments)) throw Error('Expected {tool, arguments}');
} catch (error) { console.error(error.message); process.exit(2); }
const actions=new Set(['publish_paper_thesis','execute_paper_trade']);
if (actions.has(input.tool) && (process.env.DAYBREAK_OKX_ALLOW_PAPER_ACTIONS !== '1' || !input.confirmed || typeof input.idempotencyKey !== 'string')) {
  console.error('Paper action requires operator-enabled actions, explicit confirmation and an idempotency key'); process.exit(2);
}
if (input.tool==='prepare_flash_order' && process.env.DAYBREAK_OKX_ALLOW_FLASH_PREPARE!=='1') {
  console.error('Flash preparation is not enabled for this provider'); process.exit(2);
}
const key=process.env.DAYBREAK_AGENT_API_KEY;
if (input.tool.startsWith('get_my_') || ['prepare_paper_thesis','publish_paper_thesis','quote_paper_trade','execute_paper_trade','get_operation','prepare_flash_order','get_flash_order'].includes(input.tool)) {
  if (!key) { console.error('Connected actor is not configured'); process.exit(2); }
}
try {
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',...(key?{authorization:`Bearer ${key}`}:{}) ,...(input.idempotencyKey?{'idempotency-key':input.idempotencyKey}:{})},body:JSON.stringify({tool:input.tool,arguments:input.arguments}),signal:AbortSignal.timeout(20_000)});
  const data=await response.json();
  process.stdout.write(`${JSON.stringify(data)}\n`);
  if (!response.ok) process.exitCode=1;
} catch (error) { console.error(`Daybreak request failed: ${error instanceof Error ? error.name : 'unknown error'}`); process.exitCode=1; }
