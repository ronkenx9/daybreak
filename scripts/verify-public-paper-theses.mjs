import fs from 'node:fs';

const ui=fs.readFileSync('components/daybreak/theses/PaperTradingMode.tsx','utf8');
const hub=fs.readFileSync('components/daybreak/theses/ThesisHub.tsx','utf8');
const card=fs.readFileSync('components/daybreak/theses/ThesisCard.tsx','utf8');
const repo=fs.readFileSync('lib/db/repo-theses.ts','utf8');
const migration=fs.readFileSync('drizzle/0018_public_paper_theses.sql','utf8');
const createRoute=fs.readFileSync('app/api/theses/paper/route.ts','utf8');
const tradeRoute=fs.readFileSync('app/api/theses/paper/[id]/trade/route.ts','utf8');
for(const phrase of ['Public simulation','public paper market','Conviction leaderboard','Public activity','position, paper balance, activity and P/L are visible'])if(!ui.toLowerCase().includes(phrase.toLowerCase()))throw Error(`Missing public paper UX: ${phrase}`);
for(const filter of ["['all','All']","['paper','Paper']","['live','Live']"])if(!hub.includes(filter))throw Error(`Missing discovery filter: ${filter}`);
if(!card.includes('Simulate')||!card.includes('public trades'))throw Error('Paper discovery card is incomplete');
if(/localStorage|sessionStorage/.test(ui))throw Error('Public paper market still uses private browser persistence');
if(!createRoute.includes('requireUser(request)')||!tradeRoute.includes('requireUser(request)'))throw Error('Public paper mutations are not identity-bound');
for(const marker of ['for update','paperStockBalances','paperPositions','paperTrades','getPublicPaperMarket'])if(!repo.includes(marker))throw Error(`Missing shared market persistence: ${marker}`);
for(const table of ['paper_thesis_markets','paper_stock_balances','paper_positions','paper_trades'])if(!migration.includes(table))throw Error(`Missing paper table: ${table}`);
if(!migration.includes('ENABLE ROW LEVEL SECURITY')||!migration.includes('REVOKE ALL'))throw Error('Paper tables are not server-only');
console.log('public paper thesis integration verified');
