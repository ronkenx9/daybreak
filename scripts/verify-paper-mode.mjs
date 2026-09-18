import fs from 'node:fs';

const ui = fs.readFileSync('components/daybreak/theses/PaperTradingMode.tsx', 'utf8');
const hub = fs.readFileSync('components/daybreak/theses/ThesisHub.tsx', 'utf8');
const engine = fs.readFileSync('lib/theses/paper.ts', 'utf8');
const css = fs.readFileSync('app/daybreak.css', 'utf8');
for (const phrase of ['Create a paper thesis', 'Paired stock token', 'Why you believe it', 'Create paper thesis', 'New paper thesis', 'Simulation · no wallet', 'Every balance and result below is simulated', 'never constructs a transaction', 'Wallet signature', 'Reset paper account']) {
  if (!ui.includes(phrase)) throw new Error(`Missing paper disclosure or control: ${phrase}`);
}
if (!ui.includes('Preparing paper markets…') || !hub.includes('instrumentState={state}')) throw new Error('Paper loading state is not connected to the instrument request');
if (/authedFetch|ensureSolanaWallet|signSolanaTransaction|\/api\/theses/.test(ui)) throw new Error('Paper UI reaches authentication, signing, or live thesis APIs');
if (!ui.includes('if(!available.length)return') || !ui.includes("restored.theses.length?'trade':'create'")) throw new Error('Paper mode cannot initialize safely before instruments and paper theses are ready');
if (!hub.includes("mode==='paper'") || !hub.includes('Try paper mode')) throw new Error('Conviction does not expose paper mode');
if (!engine.includes('PAPER_STARTING_STOCK_BALANCE') || !engine.includes('addPaperThesis') || !engine.includes('executePaperTrade') || !engine.includes('realizedPnlQuote')) throw new Error('Paper thesis engine is incomplete');
if (!css.includes('.db-paper-mode') || !css.includes('.db-paper-create') || !css.includes('.db-paper-disclosure')) throw new Error('Paper mode styling is missing');
console.log('paper mode integration verified');
