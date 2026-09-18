# Gates: Meteora DBC stock-token quote test

OWNS: scripts/test-dbc-stock-quote.mjs, docs/dbc-stock-quote-test/**

Scope: Produce a reproducible, non-broadcast mainnet compatibility verdict for using the canonical AAPLx mint as a Meteora DBC quote token.

- [x] G1: The test reads the canonical AAPLx mint, its Token-2022 extensions, and its Meteora token-badge account from Solana mainnet.
  CHECK: node scripts/test-dbc-stock-quote.mjs --inspect
  EXPECT: AAPLx stock-mint inspection complete
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=9d5c26d814b6f7d9f02e93639d3c830b87c62d2287ee09a24132a318a7b4542c; exit=0; EXPECT=matched; output-sha256=30182491153f7bbdb9b4449bd2e51ac02a60730da9fc149248f5dd58d0839ea4; output-bytes=482; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: The test builds and simulates a fresh thesis-token DBC config and pool using AAPLx as the quote mint, then reports a definitive compatible or incompatible verdict without broadcasting.
  CHECK: node scripts/test-dbc-stock-quote.mjs --simulate
  EXPECT: DBC AAPLx quote compatibility verdict: compatible
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=68123a68439cceadb3f38e133f8b0c72357923a7088b0ca7463409111ffe8393; exit=0; EXPECT=matched; output-sha256=2b0c4cd65d17cb8993219e3afb197b30691dd90900b858184e797da1c1e71d5b; output-bytes=1467; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
