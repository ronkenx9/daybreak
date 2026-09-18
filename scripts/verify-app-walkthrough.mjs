import assert from 'node:assert/strict';
import fs from 'node:fs';

const guide = fs.readFileSync('components/daybreak/WelcomeGuide.tsx', 'utf8');
const app = fs.readFileSync('components/daybreak/DaybreakApp.tsx', 'utf8');
const css = fs.readFileSync('app/daybreak.css', 'utf8');

for (const phrase of [
  'Find companies your way.',
  'The story, chart and conversation stay together.',
  'Same company. Different products.',
  'See what changed in your stocks.',
  'Hold the stock. Unlock the room.',
  'What are you into?',
]) assert.match(guide, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

for (const boundary of [
  'Base · Coinbase',
  'Solana · Backed',
  'Quotes stay review-only',
  'short-lived yes-or-no proof',
  'never your quantity',
]) assert.ok(guide.includes(boundary), `missing product boundary: ${boundary}`);

for (const canonicalComponent of ['CharacterCrew', 'StockIcon', 'AvatarStack']) {
  assert.match(guide, new RegExp(`<${canonicalComponent}\\b`));
}

assert.match(guide, /aria-label={`Go to step \$\{index \+ 1\}`}/);
assert.match(guide, /event\.key === 'ArrowLeft'/);
assert.match(guide, /event\.key === 'ArrowRight'/);
assert.match(guide, /onTouchStart=/);
assert.match(guide, /onTouchEnd=/);
assert.match(guide, /Math\.abs\(delta\) < 48/);
assert.match(app, /aria-label="Open app walkthrough"/);
assert.match(app, /setOnboardEdit\(false\);setOnboard\(true\)/);

assert.doesNotMatch(guide, /next\/image|assets\/onboarding|imagegen|generated[_ -]?image/i);
assert.match(css, /\.db-guide-trigger\{/);
assert.match(css, /\.db-guide-slide\{display:grid/);
assert.match(css, /\.db-app\[data-theme="dark"\] \.db-guide/);
assert.match(css, /\.db-app:has\(\.db-dialog-overlay\) \.db-app-nav\{z-index:0\}/);
assert.match(css, /@media\(max-width:700px\)[\s\S]*\.db-guide-slide\{grid-template-columns:1fr/);

console.log('app walkthrough verification passed');
