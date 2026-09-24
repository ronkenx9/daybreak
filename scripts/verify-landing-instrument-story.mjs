import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [page, layout, story, stories, locale, css] = await Promise.all([
  read('app/page.tsx'),
  read('app/layout.tsx'),
  read('components/daybreak/LandingInstrumentStory.tsx'),
  read('components/daybreak/LandingStories.tsx'),
  read('components/daybreak/LocaleProvider.tsx'),
  read('app/daybreak.css'),
]);

assert.match(page, /<LandingInstrumentStory \/>/, 'landing must render the new product story');
assert.match(page, /Stocks on chain/, 'hero must describe on-chain stocks across supported networks');
assert.match(page, /Start with the company\./, 'landing must lead with company identity');
assert.match(page, /Ownership proof, not balances/, 'privacy boundary must be visible');
assert.doesNotMatch(page, /Every stock,[\s\S]{0,80}a token on Base/, 'obsolete Base-only claim must be removed');
assert.match(layout, /compare exact stock instruments on Base and Solana/i, 'page metadata must match the cross-network product');
assert.doesNotMatch(layout, /pairing intelligence for tokenized stocks on Base/, 'obsolete Base-only metadata must be removed');

for (const expected of [
  'Base · Coinbase',
  'Solana · Backed Finance',
  '0xb200000000000000000000c2e324d24d7eecd1fb',
  'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
  'Review only · no transaction created',
  '/app?stock=AAPL',
]) assert.ok(story.includes(expected), `instrument story missing: ${expected}`);

assert.ok(story.indexOf('Discover the company') < story.indexOf('Compare exact assets'));
assert.ok(story.indexOf('Compare exact assets') < story.indexOf('Review the quote'));
assert.ok(story.indexOf('Review the quote') < story.indexOf('Verify and join'));
assert.match(stories, /Your holdings, with context\./, 'down-page marketing must reflect the private briefing');
assert.match(stories, /Ownership opens the room\./, 'down-page marketing must explain holder access');

for (const phrase of ['Acciones on-chain', 'Actions on-chain', 'Ações on-chain', '链上股票']) {
  assert.ok(locale.includes(phrase), `localized cross-network story missing: ${phrase}`);
}
assert.match(css, /\.db-instrument-story-layout\{display:grid/, 'desktop instrument layout missing');
assert.match(css, /@media\(max-width:760px\)[\s\S]*\.db-demo-instruments\{grid-template-columns:1fr\}/, 'mobile instrument stack missing');

console.log('landing instrument story verification passed');
