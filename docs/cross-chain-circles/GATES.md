# Gates: Cross-chain stock Circles foundation

OWNS: lib/assets/**, lib/account/auth-server.ts, lib/db/schema.ts, lib/db/repo.ts, lib/solana/holdings.ts, app/api/solana/holdings/route.ts, app/api/solana/holdings/sync/route.ts, components/daybreak/CirclesHub.tsx, drizzle/0016_*.sql, drizzle/meta/0016_snapshot.json, drizzle/meta/_journal.json, scripts/verify-cross-chain-circles.mjs, scripts/audit-core.cjs, docs/cross-chain-circles/**

Scope: Make one company Circle unlock from authenticated, short-lived ownership evidence on either Base or Solana while retaining exact instrument identity and never storing position size.

- [x] G1: The canonical registry resolves Base and Solana instruments to the same stable company and rejects aliases that are not exact registered identities.
  CHECK: node scripts/verify-cross-chain-circles.mjs registry
  EXPECT: registry verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=9cda3b04301ca89aa53ccb9fb39d7a417d2a11c87a33f69a09c9702a3afa125c; exit=0; EXPECT=matched; output-sha256=dba25080f500ea5614084ba25f157fa83062f737411d0010012d37ff5e0b0915; output-bytes=29; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Holding eligibility is scoped by user, wallet, and chain so a refresh on one chain cannot erase another chain's proof, and the stored proof contains no balance or quantity.
  CHECK: node scripts/verify-cross-chain-circles.mjs evidence
  EXPECT: evidence verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=34cbd1b629caccd38e82e777d431e279f1040b4611d15b33f1660301d46d1741; exit=0; EXPECT=matched; output-sha256=c2497ecd1264dbf917441cd8932234b7fd80ba94b350ea341003342669dce514; output-bytes=29; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: A signed-in user can verify a Privy-linked Solana wallet and unlock the same Circle eligibility flow used by Base holdings.
  CHECK: node scripts/verify-cross-chain-circles.mjs solana-sync
  EXPECT: solana sync verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=066a7a244b55247209eddc03451b26e7cf8ab1c14e343f8545052cdbdb381abc; exit=0; EXPECT=matched; output-sha256=2f7f08a1ef116b8fe1924710755286f778635590f66809ee6bf8fb456f054938; output-bytes=32; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: Daybreak's acceptance audit and TypeScript validation pass after the cross-chain integration.
  CHECK: npm test && npm run type-check && echo cross-chain static checks passed
  EXPECT: cross-chain static checks passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=a0de91ab7dfc3bee58699134a6e4f250fff472492df2d513f82d5010812cf263; exit=0; EXPECT=matched; output-sha256=a5367d820992732a394324e2e5eb2de2e1e1ec035b46ce11db24eb3aa9b8bb1c; output-bytes=2098; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G5: The production Next.js build compiles with the new registry, migration, route, and Circle controls.
  CHECK: npm run build && echo cross-chain production build passed
  EXPECT: cross-chain production build passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=75fab3707ad72cd6bee458f27643ed59824114fba40b46bcaae328453d45d60d; exit=0; EXPECT=matched; output-sha256=7c9af756cb15b99011b648756a895e95c4ca3ba2ed9ce8f9ea7125454908f6c5; output-bytes=7176; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
