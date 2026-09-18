# Gates: Paper audit fixes after 2571241

OWNS: components/daybreak/theses/PaperTradingMode.tsx, lib/theses/paper-pending.ts, lib/theses/paper-pagination.ts, app/api/theses/paper/route.ts, lib/db/repo-theses.ts, lib/db/schema.ts, drizzle/0020_paper_creation_intents.sql, drizzle/meta/_journal.json, scripts/test-paper-followup.cjs, scripts/test-paper-database.cjs, docs/audit-paper-2571241/**, .unlazy/paper-audit-2571241-fixes/GATES.md

Scope: Prevent cross-tab recovery loss, make paper thesis publication retries idempotent, and serialize pagination transitions.

- [x] G1: Cross-tab pending trades cannot overwrite a different unresolved intent, and pagination cannot append a duplicate transition cursor.
  CHECK: node scripts/test-paper-followup.cjs
  EXPECT: paper follow-up behavior verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=8863fed2f149efc6e37614895a596a49766091b7b424816d844ad881c998041f; exit=0; EXPECT=matched; output-sha256=34c924be13647c121cc0528773ed4ddf1f95552206063dc2a0bcf8d9616311e0; output-bytes=64; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Reusing one paper publication intent returns one thesis and does not consume another daily slot.
  CHECK: node scripts/test-paper-database.cjs
  EXPECT: paper database integration passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=425efcffa91d3c2df82ad84b6b2efb9d45699cd81ab6621f15fd3b8cd4b0a6a8; exit=0; EXPECT=matched; output-sha256=f8be9f2e6e340e02eda04c43305f8a88a0c49ade122b7baceed0496ee578293a; output-bytes=157; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: Existing acceptance coverage remains green.
  CHECK: npm test
  EXPECT: 43 acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=bf6f0ffcef8499b87f7e5b0c05369c63a1a14d85ca70e2b0a1c271c90758dc67; exit=0; EXPECT=matched; output-sha256=c588c6a6f9b142cfa12d6b528373ca5dbd5b5b6220e172421df8d938338f4005; output-bytes=2933; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: Types compile.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G5: Production application builds.
  CHECK: npm run build
  EXPECT: Generating static pages
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d813e15a0f156714ca07a24e96ccbede7f3949d554a5c0f517f628347f886c46; exit=0; EXPECT=matched; output-sha256=06281dba90dd3c90430e7d3a478f2811808ce0b58a86d85b07d524c966e470ef; output-bytes=8691; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
