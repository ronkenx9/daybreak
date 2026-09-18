# Gates: Conviction paper trading

OWNS: components/daybreak/theses/PaperTradingMode.tsx, components/daybreak/theses/ThesisHub.tsx, lib/theses/paper.ts, app/daybreak.css, scripts/audit-core.cjs, docs/thesis-markets/PAPER-TRADING.md, .unlazy/paper-trading/GATES.md

Scope: Add a wallet-free, clearly simulated paper account that teaches stock-paired thesis backing and selling inside Conviction.

- [x] G1: Paper quotes and executions preserve balances, positions, fee math, price impact, average entry, realized P/L, and reset behavior.
  CHECK: npm test
  EXPECT: 41 acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=289438183300ebb7b60149f98b9d26dec2fb2f56510891b350b89a0d5891a001; exit=0; EXPECT=matched; output-sha256=284ff5204f1bdbb420aa7286d370e3a658abbb497e25f5a3cdb7ca21ffacbc3c; output-bytes=2808; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: The paper-mode UI is reachable from Conviction, requires no authentication or signing, persists locally, and labels every simulated value.
  CHECK: node scripts/verify-paper-mode.mjs
  EXPECT: paper mode integration verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=cdbc1fd42e3b86243ed8a77732bfe50f0289a42c2e3faadcefbfae6dd19758f3; exit=0; EXPECT=matched; output-sha256=c03b566cad51a4e22e7af0d01b11d5f5d6231930c910a842f493904fc453baf0; output-bytes=32; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The complete application remains type-safe.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The production application compiles with the integrated paper experience.
  CHECK: npm run build
  EXPECT: Generating static pages
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d813e15a0f156714ca07a24e96ccbede7f3949d554a5c0f517f628347f886c46; exit=0; EXPECT=matched; output-sha256=6e1757a1b93adc5b05db49019fbdc4e1c4edea521aef1371c021b051f51d60a9; output-bytes=8352; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
