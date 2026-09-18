import assert from 'node:assert/strict';
import fs from 'node:fs';

const mode = process.argv[2];
const registry = fs.readFileSync('lib/theses/instruments.ts', 'utf8');
const curve = fs.readFileSync('lib/solana/dbc/config.ts', 'utf8');
const launch = fs.readFileSync('lib/solana/dbc/launch.ts', 'utf8');

if (mode === 'registry') {
  assert.match(registry, /id: `solana:\$\{instrument\.identity\}`/);
  assert.match(registry, /deriveTokenBadgeAddress\(new PublicKey\(instrument\.identity\)\)/);
  assert.match(registry, /creation_verified/);
  assert.match(registry, /verification_pending/);
  assert.match(registry, /XSTOCK_QUOTE_ELIGIBILITY_VERIFIED_AT/);
  assert.match(registry, /lifecycle: \{ create: true, buy: true, sell: true, graduate: false \}/);
  assert.doesNotMatch(registry, /USDC_SOLANA_MINT/);
  console.log('thesis instrument registry verified');
} else if (mode === 'curve') {
  assert.match(curve, /case 8: return TokenDecimal\.EIGHT/);
  assert.match(curve, /tokenSupply: null/);
  assert.match(curve, /supplyMode: 'dynamic'/);
  assert.match(curve, /creatorPermanentLockedLiquidityPercentage: 100/);
  assert.doesNotMatch(curve, /referenceValuationUsd|equityMarketCaps|initialCapMultiple/);
  console.log('thesis curve verified');
} else if (mode === 'launch') {
  assert.match(launch, /requireThesisInstrument\(input\.instrumentId, 'create'\)/);
  assert.match(launch, /tokenBadge,/);
  assert.match(launch, /quoteMint,/);
  assert.match(launch, /getAccountInfo\(tokenBadge/);
  assert.doesNotMatch(launch, /USDC_SOLANA_MINT|referenceValuationUsd|body\.quoteMint/);
  console.log('thesis launch binding verified');
} else {
  throw new Error('Use registry, curve, or launch');
}
