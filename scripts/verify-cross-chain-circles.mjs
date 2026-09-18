import assert from 'node:assert/strict';
import fs from 'node:fs';

const mode = process.argv[2];
const read = (path) => fs.readFileSync(path, 'utf8');

if (mode === 'registry') {
  const source = read('lib/assets/companies.ts');
  assert.match(source, /companyId:\s*'apple'/);
  assert.match(source, /namespace:\s*'eip155:8453'/);
  assert.match(source, /namespace:\s*'solana:mainnet'/);
  assert.match(source, /identity:\s*'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp'/);
  assert.match(source, /instrumentByIdentity/);
  assert.match(source, /identity === instrument\.identity/);
  console.log('registry verification passed');
} else if (mode === 'evidence') {
  const schema = read('lib/db/schema.ts').split('export const holdingEligibilities')[1].split('export const circleMemberships')[0];
  const repo = read('lib/db/repo.ts');
  assert.match(schema, /chainNamespace:\s*text\('chain_namespace'\)/);
  assert.match(schema, /primaryKey\(\{ columns: \[t\.userId, t\.ticker, t\.walletAddress, t\.chainNamespace\] \}\)/);
  assert.doesNotMatch(schema, /\b(balance|quantity|shares|amount)\b/i);
  assert.match(repo, /eq\(holdingEligibilities\.walletAddress, walletAddress\)/);
  assert.match(repo, /eq\(holdingEligibilities\.chainNamespace, chainNamespace\)/);
  console.log('evidence verification passed');
} else if (mode === 'solana-sync') {
  const auth = read('lib/account/auth-server.ts');
  const route = read('app/api/solana/holdings/sync/route.ts');
  const ui = read('components/daybreak/CirclesHub.tsx');
  assert.match(auth, /requireUserOwningSolanaWallet/);
  assert.match(auth, /account\.chainType === 'solana'/);
  assert.match(route, /requireUserOwningSolanaWallet/);
  assert.match(route, /readSolanaXstockHoldings/);
  assert.match(route, /syncSolanaHoldingEligibility/);
  assert.match(ui, /\/api\/solana\/holdings\/sync/);
  assert.match(ui, /Verify Solana holdings/);
  console.log('solana sync verification passed');
} else {
  throw new Error('Usage: node scripts/verify-cross-chain-circles.mjs registry|evidence|solana-sync');
}
