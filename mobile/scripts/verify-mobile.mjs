import assert from 'node:assert/strict';
import { appLink, circles, companies, prices, stats, stockLink, theses, thesisLink } from '../src/api.ts';

const originalFetch = globalThis.fetch;
const respond = (body, status = 200) => { globalThis.fetch = async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }); };
try {
  respond({ items: [{ ticker: 'AAPL', name: 'Apple', baseSymbol: 'AAPLc', solanaSymbol: 'AAPLx', solanaInstrumentId: 'solana:mint' }, { ticker: 42 }] });
  assert.deepEqual((await companies()).map((item) => item.ticker), ['AAPL']);
  respond({ circles: [{ slug: 'apple-holders', name: 'Apple holders', description: null, kind: 'stock', tickers: ['AAPL'], memberCount: 2, pinned: false }] });
  assert.equal((await circles())[0].memberCount, 2);
  respond({ items: [{ id: '1', slug: 'apple-ai', title: 'Apple AI', summary: 'A public idea', mode: 'paper' }] });
  assert.equal((await theses('paper'))[0].mode, 'paper');
  respond({ configured: true, accounts: 7 });
  assert.equal((await stats()).accounts, 7);
  respond({ prices: { AAPL: { priceUsd: 200, source: 'pyth', asOf: 1, stale: false } } });
  assert.equal((await prices(['AAPL'])).AAPL.priceUsd, 200);
  assert.equal(appLink(thesisLink('apple-ai', 'paper')), 'https://www.daybreakcircles.lol/app/conviction?thesis=apple-ai&simulate=1');
  assert.equal(appLink(thesisLink('apple-ai', 'live')), 'https://www.daybreakcircles.lol/app/conviction?thesis=apple-ai');
  assert.equal(appLink(stockLink('AAPL')), 'https://www.daybreakcircles.lol/app?stock=AAPL');
  assert.throws(() => appLink('https://example.com'));
  assert.throws(() => thesisLink('../profile', 'paper'));
  respond({ items: null });
  await assert.rejects(companies(), /unexpected format/);
  respond({}, 429);
  await assert.rejects(circles(), /Daybreak is busy/);
  console.log('IOS_CONTRACT_OK');
} finally { globalThis.fetch = originalFetch; }
