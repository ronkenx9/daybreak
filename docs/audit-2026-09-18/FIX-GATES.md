# Gates: Daybreak audit fixes

OWNS: app/api/circles/news/route.ts, app/api/me/briefing/route.ts, app/api/token-launches/route.ts, components/daybreak/CircleNews.tsx, components/daybreak/Dialog.tsx, components/daybreak/WelcomeGuide.tsx, lib/briefing/model.ts, lib/briefing/service.ts, lib/db/repo.ts, scripts/verify-holdings-briefing.mjs, scripts/verify-audit-fixes.mjs, app/daybreak.css, docs/audit-2026-09-18/**

Scope: Resolve every actionable finding from the 2026-09-18 Daybreak product and code audit.

- [x] G1: Holding briefings include corporate actions only for the exact verified Backed xStock mint while retaining company news for other verified instruments.
  CHECK: node scripts/verify-holdings-briefing.mjs
  EXPECT: holdings briefing verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=b3f9aa19a06a2e9bbdbb4e6604796c731cbedaad3a618c6dbc1a2def0e8530eb; exit=0; EXPECT=matched; output-sha256=b7fdae74d5b2650bcee6fd34355cbe120de864b6194fbb32cd12ee8cac99cd5a; output-bytes=38; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Partial Circle news coverage is disclosed, launch quotas are claimed durably, stacked dialogs coordinate keyboard and scroll behavior, and walkthrough icons retain their shape.
  CHECK: node scripts/verify-audit-fixes.mjs
  EXPECT: audit fixes verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=882e2e5ad10f1cf77efaba4524603c4c368cc7aa0d45d7e9d169d20610a84e37; exit=0; EXPECT=matched; output-sha256=6b16f86511e7e042f1d46d7884040a7e01890fe868299754a8e96bc3d6671e4f; output-bytes=32; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The complete acceptance suite remains green.
  CHECK: npm test
  EXPECT: acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e4cae9dfe2744e9e7883703f2050601b4208ea0541089c4a76e009905a9a4579; exit=0; EXPECT=matched; output-sha256=6a81898639b94f228b521f9adcdcb260dc811e20680cbca85c1ae9ce21e491fc; output-bytes=2618; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The application type-checks.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G5: The production application builds successfully.
  CHECK: npm run build
  EXPECT: Compiled successfully
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=17992646590e52096726758d5dc47d9ebe277a0e8a47d09114765944f5bfa97e; exit=0; EXPECT=matched; output-sha256=72428acb9139a25da5e892f15f3ce7e7ad481ca874d9ba351f4272ffc813b1da; output-bytes=7210; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
