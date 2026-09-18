import assert from 'node:assert/strict';
import fs from 'node:fs';

const mode = process.argv[2];
const schema = fs.readFileSync('lib/db/schema.ts', 'utf8');
const migration = fs.readFileSync('drizzle/0017_thesis_markets.sql', 'utf8');
const repo = fs.readFileSync('lib/db/repo-theses.ts', 'utf8');
const createRoute = fs.readFileSync('app/api/theses/route.ts', 'utf8');
const previewRoute = fs.readFileSync('app/api/theses/[id]/preview/route.ts', 'utf8');
const submitRoute = fs.readFileSync('app/api/theses/[id]/submit/route.ts', 'utf8');

if (mode === 'schema') {
  for (const name of ['theses', 'thesisMarkets', 'thesisUpdates', 'thesisFollows', 'thesisComments']) assert.match(schema, new RegExp(`export const ${name}`));
  assert.match(schema, /uniqueIndex\('thesis_markets_thesis_idx'\)/);
  assert.match(schema, /uniqueIndex\('thesis_markets_pool_idx'\)/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/g);
  assert.match(migration, /REVOKE ALL ON TABLE "theses", "thesis_markets", "thesis_updates", "thesis_follows", "thesis_comments"/);
  assert.match(migration, /"transaction_message_hash" text NOT NULL/);
  console.log('thesis persistence schema verified');
} else if (mode === 'api') {
  assert.match(createRoute, /requireUser\(request\)/);
  assert.match(createRoute, /normalizeThesisDraft/);
  assert.match(previewRoute, /requireUserOwningSolanaWallet/);
  assert.match(previewRoute, /buildThesisLaunchTransaction/);
  assert.match(previewRoute, /transactionMessageHash/);
  assert.match(previewRoute, /recordThesisPreview/);
  assert.doesNotMatch(previewRoute, /body\.quoteMint|body\.tokenBadge|referenceValuationUsd/);
  console.log('thesis API validation verified');
} else if (mode === 'intent') {
  assert.match(repo, /pg_advisory_xact_lock/);
  assert.match(repo, /DUPLICATE_THESIS_INTENT/);
  assert.match(submitRoute, /transaction\.feePayer\?\.toBase58\(\) !== stored\.market\.creatorWallet/);
  assert.match(submitRoute, /transaction\.recentBlockhash !== stored\.market\.recentBlockhash/);
  assert.match(submitRoute, /transactionMessageHash\(transaction\.serializeMessage\(\)\) !== stored\.market\.transactionMessageHash/);
  assert.match(submitRoute, /transaction\.verifySignatures\(true\)/);
  assert.match(submitRoute, /status: 'unknown'/);
  assert.match(submitRoute, /sendRawTransaction/);
  console.log('thesis signed intent verified');
} else throw new Error('Use schema, api, or intent');
