import fs from 'node:fs';

const app = fs.readFileSync('components/daybreak/DaybreakApp.tsx', 'utf8');
const route = fs.readFileSync('app/app/holdings/page.tsx', 'utf8');

const assertions = [
  [!app.includes("id:'holdings'"), 'Holdings remains in main navigation'],
  [app.includes("page==='profile'&&<><section className=\"db-holdings-summary"), 'Portfolio summary is not part of You'],
  [app.includes('page===\'profile\'&&<div className="db-profile-grid db-profile-merged"'), 'Identity settings are not part of You'],
  [app.includes('<Portfolio snapshot={snapshot}'), 'Base portfolio is missing from You'],
  [app.includes('<SolanaHoldings/>') && app.includes('<PreStocksHoldings/>'), 'Cross-network holdings are missing from You'],
  [!app.includes('<ConnectButton'), 'A duplicate Connect wallet control remains in DaybreakApp'],
  [route.includes("redirect('/app/profile')"), 'Legacy holdings route does not redirect to You'],
];

for (const [condition, message] of assertions) {
  if (!condition) throw new Error(message);
}

console.log('holdings/profile merge verified');
