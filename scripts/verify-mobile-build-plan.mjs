import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const planPath = resolve(root, 'docs/MOBILE-BUILD-PLAN.md');
const plan = readFileSync(planPath, 'utf8');

const boards = [
  '01-onboarding.png',
  '02-market-and-trade.png',
  '03-events-passport-analytics.png',
  '04-circles-and-rewards.png',
  '05-learn-create-profile.png',
  '06-mascot-motion.png',
  '07-design-bible.png',
];

for (const board of boards) {
  const relative = `./mobile-mockups/${board}`;
  if (!plan.includes(relative)) throw new Error(`Missing image reference: ${relative}`);
  if (!existsSync(resolve(root, 'docs/mobile-mockups', board))) throw new Error(`Missing image file: ${board}`);
}

for (let screen = 1; screen <= 15; screen += 1) {
  const label = String(screen).padStart(2, '0');
  if (!new RegExp(`^### ${label} `, 'm').test(plan)) throw new Error(`Missing screen ${label}`);
}

const mascotStates = ['Idle float', 'Guide point', 'Thinking', 'Loading', 'Fresh data', 'Caution', 'Success', 'Together'];
for (const state of mascotStates) {
  if (!plan.includes(`| ${state} |`)) throw new Error(`Missing mascot state: ${state}`);
}

for (const requirement of [
  'Price context and freshness',
  'Corporate actions and their actual token effects',
  'Instrument rights and restrictions',
  'Honest personal analytics',
  'Reduced motion',
]) {
  if (!plan.includes(requirement)) throw new Error(`Missing requirement: ${requirement}`);
}

console.log('mobile build plan verification passed');
