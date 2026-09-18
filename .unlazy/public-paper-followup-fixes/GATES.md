# Gates: Public paper follow-up fixes

OWNS: components/daybreak/theses/PaperTradingMode.tsx, components/daybreak/theses/ThesisHub.tsx, components/daybreak/theses/types.ts, lib/theses/paper-pending.ts, lib/theses/paper-pagination.ts, lib/db/repo-theses.ts, app/api/theses/paper/[id]/route.ts, app/api/theses/paper/participants/[id]/route.ts, app/paper/participants/[id]/page.tsx, scripts/test-paper-followup.cjs, scripts/test-paper-database.cjs, scripts/verify-public-paper-theses.mjs, docs/audit-public-paper/FIXES.md, .unlazy/public-paper-followup-fixes/GATES.md

Scope: Preserve uncertain trade recovery across navigation and identity changes, prevent stale mutation/poll results, refresh filtered discovery after publishing, and replace mutable offset pagination with stable cursors.

- [x] G1: Pending trade persistence, identity-scoped mutation results, non-overlapping polling and filtered publication transitions have executable regression coverage.
  CHECK: node scripts/test-paper-followup.cjs
  EXPECT: paper follow-up behavior verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=8863fed2f149efc6e37614895a596a49766091b7b424816d844ad881c998041f; exit=0; EXPECT=matched; output-sha256=34c924be13647c121cc0528773ed4ddf1f95552206063dc2a0bcf8d9616311e0; output-bytes=64; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Repository integration verifies stable cursor pagination while participants trade and new activity arrives.
  CHECK: node scripts/test-paper-database.cjs
  EXPECT: paper database integration passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=425efcffa91d3c2df82ad84b6b2efb9d45699cd81ab6621f15fd3b8cd4b0a6a8; exit=0; EXPECT=matched; output-sha256=f8be9f2e6e340e02eda04c43305f8a88a0c49ade122b7baceed0496ee578293a; output-bytes=157; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: Existing acceptance groups remain green.
  CHECK: npm test
  EXPECT: 43 acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=bf6f0ffcef8499b87f7e5b0c05369c63a1a14d85ca70e2b0a1c271c90758dc67; exit=0; EXPECT=matched; output-sha256=c588c6a6f9b142cfa12d6b528373ca5dbd5b5b6220e172421df8d938338f4005; output-bytes=2933; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: Types compile.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G5: The production application builds.
  CHECK: npm run build
  EXPECT: Generating static pages
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d813e15a0f156714ca07a24e96ccbede7f3949d554a5c0f517f628347f886c46; exit=0; EXPECT=matched; output-sha256=498c40c42c488a5f1aa5481622e8634bb2b33f578f597a0d1e83d6a6a1d19f24; output-bytes=8691; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
