// Verifies lib/xlayer/tokens.ts against the xStocks issuer API and X Layer mainnet.
// Run: node scripts/verify-xlayer-stocks.mjs  (behind an HTTPS proxy add NODE_USE_ENV_PROXY=1)
import fs from 'node:fs';
import { createPublicClient, http, parseAbi } from 'viem';
import { xLayer } from 'viem/chains';

const src = fs.readFileSync(new URL('../lib/xlayer/tokens.ts', import.meta.url), 'utf8');
const rows = [...src.matchAll(/symbol: '([^']+)', name: '[^']*', isin: '([^']+)', token: '(0x[0-9a-f]{40})', wrapper: '(0x[0-9a-f]{40})'/g)]
  .map(([, symbol, isin, token, wrapper]) => ({ symbol, isin, token, wrapper }));
const stables = Object.fromEntries([...src.matchAll(/(USDC|USDG): '(0x[0-9a-f]{40})'/g)].map(([, k, v]) => [k, v]));
if (!rows.length) throw new Error('No registry rows parsed');

const failures = [];
const fail = (msg) => { failures.push(msg); console.log(`FAIL ${msg}`); };

// 1. Issuer API: each registry row must match the XLayer deployment it publishes.
const api = new Map();
for (let page = 0; page < 60; page++) {
  const res = await fetch(`https://api.xstocks.fi/api/v2/public/assets?page=${page}`, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (compatible; DaybreakBot/1.0)' } });
  if (!res.ok) throw new Error(`xStocks API HTTP ${res.status}`);
  const body = await res.json();
  for (const node of body.nodes) api.set(node.symbol, node);
  if (!body.page?.hasNextPage) break;
}
for (const row of rows) {
  const node = api.get(row.symbol);
  const dep = node?.deployments?.find((d) => d.network === 'XLayer');
  if (!dep) { fail(`${row.symbol}: no XLayer deployment in issuer API`); continue; }
  if (node.isin !== row.isin) fail(`${row.symbol}: ISIN ${row.isin} != API ${node.isin}`);
  if (dep.address.toLowerCase() !== row.token) fail(`${row.symbol}: token ${row.token} != API ${dep.address}`);
  if ((dep.wrapperAddressV2 || '').toLowerCase() !== row.wrapper) fail(`${row.symbol}: wrapper ${row.wrapper} != API ${dep.wrapperAddressV2}`);
  for (const coin of dep.stablecoins || []) if (stables[coin.symbol] && stables[coin.symbol] !== coin.address.toLowerCase()) fail(`${coin.symbol}: ${stables[coin.symbol]} != API ${coin.address}`);
}

// 2. Chain: symbol, decimals, supply, multiplier and wrapper asset().
const client = createPublicClient({ chain: xLayer, transport: http(process.env.XLAYER_RPC_URL || 'https://rpc.xlayer.tech') });
const abi = parseAbi(['function symbol() view returns (string)', 'function decimals() view returns (uint8)', 'function totalSupply() view returns (uint256)', 'function multiplier() view returns (uint256)', 'function asset() view returns (address)']);
const chainId = await client.getChainId();
if (chainId !== 196) throw new Error(`Expected chain 196, got ${chainId}`);
const blockNumber = await client.getBlockNumber();
const calls = rows.flatMap((r) => [
  { address: r.token, abi, functionName: 'symbol' }, { address: r.token, abi, functionName: 'decimals' },
  { address: r.token, abi, functionName: 'totalSupply' }, { address: r.token, abi, functionName: 'multiplier' },
  { address: r.wrapper, abi, functionName: 'symbol' }, { address: r.wrapper, abi, functionName: 'asset' },
]);
const out = await client.multicall({ contracts: calls, blockNumber, allowFailure: true });
rows.forEach((r, i) => {
  const [sym, dec, supply, mult, wsym, asset] = out.slice(i * 6, i * 6 + 6).map((x) => (x.status === 'success' ? x.result : undefined));
  if (sym !== r.symbol) fail(`${r.symbol}: on-chain symbol ${sym}`);
  if (Number(dec) !== 18) fail(`${r.symbol}: decimals ${dec}`);
  if (typeof supply !== 'bigint') fail(`${r.symbol}: totalSupply unreadable`);
  if (typeof mult !== 'bigint' || mult === 0n) fail(`${r.symbol}: multiplier unreadable`);
  if (wsym !== `w${r.symbol}`) fail(`${r.symbol}: wrapper symbol ${wsym}`);
  if (String(asset).toLowerCase() !== r.token) fail(`${r.symbol}: wrapper asset ${asset}`);
  if (sym === r.symbol) console.log(`ok   ${r.symbol.padEnd(7)} supply=${(Number(supply) / 1e18).toFixed(2)} multiplier=${(Number(mult) / 1e18).toFixed(6)}`);
});
for (const [name, address] of Object.entries(stables)) {
  const [sym, dec] = await Promise.all([client.readContract({ address, abi, functionName: 'symbol' }), client.readContract({ address, abi, functionName: 'decimals' })]);
  if (sym !== name || Number(dec) !== 6) fail(`${name}: on-chain ${sym}/${dec}`); else console.log(`ok   ${name} ${address}`);
}

console.log(`\n${rows.length} stocks checked at X Layer block ${blockNumber}: ${failures.length ? `${failures.length} FAILURES` : 'all passed'}`);
process.exit(failures.length ? 1 : 0);
