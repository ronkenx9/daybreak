# Gates: Paper thesis creation

OWNS: components/daybreak/theses/PaperTradingMode.tsx, lib/theses/paper.ts, app/daybreak.css, scripts/audit-core.cjs, scripts/verify-paper-mode.mjs, docs/thesis-markets/PAPER-TRADING.md, .unlazy/paper-thesis-creation/GATES.md

Scope: Let a user create and switch among simulated stock-paired theses before practicing Back and Sell trades.

- [x] G1: Paper thesis creation validates the chosen stock, thesis copy and token identity, creates an independent market, and isolates balances, positions and P/L between theses.
  CHECK: npm test
  EXPECT: 42 acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=6fa2e0db1abea83c19137666565e7195f81a45f208303d7defeb43b1b5de5424; exit=0; EXPECT=matched; output-sha256=883b1177e8821e189b13990bcdc6f35617914045b5a7cdd985bda183a730a6fd; output-bytes=2901; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Paper mode exposes a wallet-free thesis composer and routes each created thesis into the existing simulated trade workflow.
  CHECK: node scripts/verify-paper-mode.mjs
  EXPECT: paper mode integration verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=cdbc1fd42e3b86243ed8a77732bfe50f0289a42c2e3faadcefbfae6dd19758f3; exit=0; EXPECT=matched; output-sha256=c03b566cad51a4e22e7af0d01b11d5f5d6231930c910a842f493904fc453baf0; output-bytes=32; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The application remains type-safe.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The production application compiles with paper thesis creation.
  CHECK: npm run build
  EXPECT: Generating static pages
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d813e15a0f156714ca07a24e96ccbede7f3949d554a5c0f517f628347f886c46; exit=0; EXPECT=matched; output-sha256=9cc800027491af5d8f863c610e183867f26f849fab3d6307823f3d6ee4cf5952; output-bytes=8274; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
