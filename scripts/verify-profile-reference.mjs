import fs from 'node:fs';

const app = fs.readFileSync('components/daybreak/DaybreakApp.tsx', 'utf8');
const overview = fs.readFileSync('components/daybreak/ProfileOverview.tsx', 'utf8');
const css = fs.readFileSync('app/daybreak.css', 'utf8');
const interactions = process.argv.includes('--interactions');

function requireText(source, value, label) {
  if (!source.includes(value)) throw new Error(`Missing ${label}: ${value}`);
}

if (interactions) {
  requireText(app, 'profileEditorOpen', 'profile editor state');
  requireText(app, 'holdingsExpanded', 'holdings expansion state');
  requireText(app, 'Edit your profile', 'profile editor dialog');
  requireText(app, 'db-you-holdings-detail', 'on-demand holdings detail');
  requireText(overview, 'onViewHoldings', 'holdings action');
  console.log('profile interactions verified');
} else {
  requireText(app, 'Your identity, portfolio and saved companies, together.', 'profile subtitle');
  requireText(app, 'db-you-dashboard', 'two-column dashboard');
  requireText(app, 'Account preferences', 'preferences panel');
  requireText(app, 'Saved companies', 'saved panel');
  requireText(overview, 'db-you-action-bar', 'overview action bar');
  requireText(css, '.db-you-dashboard', 'dashboard styling');
  requireText(css, '.db-profile-editor', 'editor styling');
  console.log('profile reference structure verified');
}
