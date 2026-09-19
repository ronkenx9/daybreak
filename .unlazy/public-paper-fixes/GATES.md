# Gates: Public paper fixes
OWNS: lib/theses/**, lib/db/repo-theses.ts, lib/db/schema.ts, app/api/theses/**, components/daybreak/theses/**, app/paper/**, drizzle/**, scripts/test-paper-*.cjs, docs/audit-public-paper/**, .unlazy/public-paper-fixes/**
Scope: Correct protected execution and replay handling, paginated discovery and public activity, stable public portfolios, and honest simulation and P/L labels.
- [x] G1: Behavioral tests cover accepted output, expiry, discovery parameters and account calculations.
  CHECK: node scripts/test-paper-behavior.cjs
  EXPECT: paper behavioral tests passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=7999b68db2cb2bbc534666e8de9dd1b21c574cb02d08721ef2906a2694d40ad1; exit=0; EXPECT=matched; output-sha256=0e3e328cb1c0ca7a3379ed0e84a9e7f54677ffa137a4a63f5ada79bd22245b90; output-bytes=30; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
- [x] G2: Existing acceptance checks pass.
  CHECK: npm test
  EXPECT: 43 acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=bf6f0ffcef8499b87f7e5b0c05369c63a1a14d85ca70e2b0a1c271c90758dc67; exit=0; EXPECT=matched; output-sha256=c588c6a6f9b142cfa12d6b528373ca5dbd5b5b6220e172421df8d938338f4005; output-bytes=2933; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
- [x] G3: Types compile.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
- [x] G4: Production builds.
  CHECK: npm run build
  EXPECT: Generating static pages
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d813e15a0f156714ca07a24e96ccbede7f3949d554a5c0f517f628347f886c46; exit=0; EXPECT=matched; output-sha256=80275472d2129bd1c0d2f889fc7b0909e17fcd1d61e347747b4809ae3ad3ec87; output-bytes=8691; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
- [x] G5: Isolated database execution validates replay, concurrent shared spending, search and pagination.
  CHECK: node scripts/test-paper-database.cjs
  EXPECT: paper database integration passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=425efcffa91d3c2df82ad84b6b2efb9d45699cd81ab6621f15fd3b8cd4b0a6a8; exit=0; EXPECT=matched; output-sha256=f8be9f2e6e340e02eda04c43305f8a88a0c49ade122b7baceed0496ee578293a; output-bytes=157; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
