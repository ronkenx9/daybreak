import fs from 'node:fs';

const app = fs.readFileSync('components/daybreak/DaybreakApp.tsx', 'utf8');
const overview = fs.readFileSync('components/daybreak/ProfileOverview.tsx', 'utf8');
const css = fs.readFileSync('app/daybreak.css', 'utf8');

const assertions = [
  [app.includes('<ProfileOverview'), 'ProfileOverview is not rendered on You'],
  [!app.includes('<DaybreakTokenPanel address={address}/>'), 'The oversized DAYC chart remains in the profile flow'],
  [overview.includes('Portfolio balance'), 'Portfolio balance is missing'],
  [overview.includes('slice(0,4)'), 'Holdings are not capped at four'],
  [overview.includes('Connect through Sign in'), 'Disconnected state is missing'],
  [overview.includes('Reading balance…') && overview.includes('Unavailable'), 'Loading or error state is missing'],
  [overview.includes('ProfileAvatar') && overview.includes('StockIcon'), 'Identity or holdings imagery is missing'],
  [css.includes('.db-you-overview') && css.includes('@media(max-width:700px)'), 'Responsive profile styles are missing'],
];

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message);
}

console.log('profile dashboard structure verified');
