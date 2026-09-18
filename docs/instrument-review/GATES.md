# Gates: Instrument comparison and quote review

OWNS: lib/trading/**, lib/solana/jupiter.ts, app/api/trades/quote/route.ts, app/api/solana/swap-quote/route.ts, components/daybreak/InstrumentComparison.tsx, components/daybreak/StockDetails.tsx, components/daybreak/TradeSheet.tsx, components/daybreak/SolanaSwapQuote.tsx, app/daybreak.css, scripts/audit-core.cjs, scripts/verify-instrument-review.mjs, docs/instrument-review/**

Scope: Replace fragmented stock purchase blocks with one exact-instrument comparison and a normalized, read-only quote review for Base and Solana routes.

- [x] G1: Each stock workspace lists exact supported instrument identities with issuer, network, funding asset, wallet compatibility, and quote capability without treating ticker equality as instrument identity.
  CHECK: node scripts/verify-instrument-review.mjs
  EXPECT: instrument review verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=c55636c24bd1343415eb0567d78b76f209c172a3e0710f165a71ee4d0cb66f09; exit=0; EXPECT=matched; output-sha256=a954107775e1e9d1672eb3d279345c479e855e55a30fddfd663e3db2d9e6a5eb; output-bytes=38; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Base and Solana quote endpoints return the same bounded contract with raw and display amounts, decimals, costs, provider identity, freshness, expiry availability, and an explicit non-executable capability.
  CHECK: npm test
  EXPECT: acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e4cae9dfe2744e9e7883703f2050601b4208ea0541089c4a76e009905a9a4579; exit=0; EXPECT=matched; output-sha256=771733c7f3f7f0d5720361b2c66ba9a9ce576e30872ec4e336101f22c1b2cb54; output-bytes=2523; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The integrated instrument comparison and quote review type-checks across the application.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The production application builds successfully with the unified comparison replacing the separate Base and Solana quote blocks.
  CHECK: npm run build
  EXPECT: Generating static pages
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d813e15a0f156714ca07a24e96ccbede7f3949d554a5c0f517f628347f886c46; exit=0; EXPECT=matched; output-sha256=bf086fb50ed2aa5fd9d8c9f6cf06186dbc8645ab41fdd99912e8cffb1e203372; output-bytes=7208; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
