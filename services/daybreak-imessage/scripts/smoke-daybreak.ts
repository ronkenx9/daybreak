import { loadConfig } from '../src/config.js';
import { DaybreakClient } from '../src/daybreak-client.js';

const config = loadConfig();
const client = new DaybreakClient(config.apiBase, config.requestTimeoutMs);
const [discovery, market, context, theses] = await Promise.all([
  client.discover('NVDA', 3),
  client.market('NVDA'),
  client.context('NVDA', 2),
  client.theses('NVDA', 'paper', 3),
]);

if (!discovery.data.items.some((item) => item.symbol === 'NVDA')) throw new Error('NVDA missing from discovery');
if (market.data.kind !== 'underlying_equity_reference_usd') throw new Error('Price is not labeled as an equity reference');
if (context.data.company.symbol !== 'NVDA') throw new Error('Company context mismatch');
if (!Array.isArray(theses.data.items)) throw new Error('Thesis result is invalid');
console.log('daybreak production tools verified');
