# Gates: Daybreak agent paper API

OWNS: drizzle/0022_agent_participation.sql
OWNS: drizzle/meta/_journal.json
OWNS: lib/db/schema.ts
OWNS: lib/db/repo-agents.ts
OWNS: lib/db/repo-theses.ts
OWNS: lib/agents/**
OWNS: lib/theses/paper.ts
OWNS: app/api/v1/agents/**
OWNS: app/api/me/agents/**
OWNS: app/paper/agents/**
OWNS: components/daybreak/agents/**
OWNS: components/daybreak/ProfileOverview.tsx
OWNS: components/daybreak/DaybreakApp.tsx
OWNS: components/daybreak/theses/**
OWNS: app/globals.css
OWNS: app/daybreak.css
OWNS: lib/theses/discovery.ts
OWNS: docs/agents/**
OWNS: packages/agent-sdk/**
OWNS: examples/paper-agent/**
OWNS: scripts/test-agent-api-behavior.cjs
OWNS: scripts/test-agent-api-database.cjs
OWNS: scripts/verify-agent-api.mjs
OWNS: scripts/test-paper-behavior.cjs
OWNS: scripts/test-paper-database.cjs
OWNS: scripts/db-verify.mjs
OWNS: package.json

Scope: Ship the first usable Daybreak agent release: operator-owned agents, scoped revocable keys, policy limits, public paper discovery/publication/quotes/trades/recovery, public identity UI, management UI, OpenAPI, SDK and runnable dry-run example.

- [x] G1: Agent keys, scopes, request validation, retry helpers and SDK behavior reject unsafe inputs and preserve idempotency
  CHECK: node scripts/test-agent-api-behavior.cjs
  EXPECT: agent API behavioral tests passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=966535f210c76aa8ad7b232e948636b723587d486271a3d15cb210ad1887038f; exit=0; EXPECT=matched; output-sha256=be24154836b19ac28a56570b2d5c04d896f4312262f117b58a21ddcd70bc88d5; output-bytes=64; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Isolated PostgreSQL proves operator setup, actor separation, policy budgets, publish, cross-agent trade, receipt replay, pause/revoke and public privacy
  CHECK: node scripts/test-agent-api-database.cjs
  EXPECT: agent API database integration passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=8758872c442b15f82856ecb88868857b2447b70d57bdfd86755210b65d838e2f; exit=0; EXPECT=matched; output-sha256=5ff94bfa0c84c1d8a3bd3975ed9e8e6f9fa5667cc67bc1544744b9c9794f76cf; output-bytes=169; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The shipped routes, OpenAPI contract, SDK, example and consumer surfaces cover the first-release contract without live execution claims
  CHECK: node scripts/verify-agent-api.mjs
  EXPECT: agent API release surface verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=8e738bcc1835c8cfee6e68556b290ef9e2160c6d993d289871e1a247e272d891; exit=0; EXPECT=matched; output-sha256=ce5b6bfb2ee47dc1ded3f7e764f8a1eb05436fb9dc3c9d3ea683456cdae007e1; output-bytes=35; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: Existing Daybreak acceptance coverage remains green
  CHECK: npm test
  EXPECT: 43 acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=bf6f0ffcef8499b87f7e5b0c05369c63a1a14d85ca70e2b0a1c271c90758dc67; exit=0; EXPECT=matched; output-sha256=c588c6a6f9b142cfa12d6b528373ca5dbd5b5b6220e172421df8d938338f4005; output-bytes=2933; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G5: TypeScript passes
  CHECK: npm run type-check
  EXPECT: type-check
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=56310e4c7eee2918b6ac48587632f6f1629af403dec25ea6b46034b2abe76ab1; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G6: Production build succeeds
  CHECK: npm run build
  EXPECT: Compiled successfully
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=17992646590e52096726758d5dc47d9ebe277a0e8a47d09114765944f5bfa97e; exit=0; EXPECT=matched; output-sha256=77022fb2a5eb4e76677a98769e8c2e69e9e5eb2904361b2b04afd11a0714ab2b; output-bytes=10270; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
