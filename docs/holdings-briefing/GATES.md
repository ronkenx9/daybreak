# Gates: Holdings briefing

OWNS: lib/briefing/**, lib/account/cache.ts, lib/db/repo.ts, app/api/me/briefing/route.ts, components/daybreak/HoldingsBriefing.tsx, components/daybreak/DaybreakApp.tsx, components/daybreak/CirclesHub.tsx, components/daybreak/CircleNews.tsx, app/daybreak.css, scripts/audit-core.cjs, scripts/verify-holdings-briefing.mjs, docs/holdings-briefing/**

Scope: Ship a private, sourced, account-isolated holdings briefing on the profile page with useful event ranking, honest coverage states, and direct company or Circle actions.

- [x] G1: The authenticated briefing API derives only live eligibility, emits private no-store responses, ranks upcoming issuer actions before news, deduplicates stories, and returns bounded results with explicit coverage states.
  CHECK: node scripts/verify-holdings-briefing.mjs
  EXPECT: holdings briefing verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=b3f9aa19a06a2e9bbdbb4e6604796c731cbedaad3a618c6dbc1a2def0e8530eb; exit=0; EXPECT=matched; output-sha256=b7fdae74d5b2650bcee6fd34355cbe120de864b6194fbb32cd12ee8cac99cd5a; output-bytes=38; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: The profile presents three initial briefing items with reveal-all, source links, company or Circle actions, account-scoped query caching, and distinct loading, empty-holdings, no-development, partial, and outage states.
  CHECK: npm test
  EXPECT: acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e4cae9dfe2744e9e7883703f2050601b4208ea0541089c4a76e009905a9a4579; exit=0; EXPECT=matched; output-sha256=efcd6d3953fb82c34f2896e5303c4f341e7d71f4aa68439ec19e7d28c621fe7d; output-bytes=2365; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The complete application type-checks after the briefing integration.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The production application builds successfully with the new API and client component.
  CHECK: npm run build
  EXPECT: Generating static pages
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d813e15a0f156714ca07a24e96ccbede7f3949d554a5c0f517f628347f886c46; exit=0; EXPECT=matched; output-sha256=f95f0d4a31b39b6e9bcc1cc625734898a6886c3f21f2adaff3c92ee1bf39b474; output-bytes=7208; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
