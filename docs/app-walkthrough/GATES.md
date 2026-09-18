# Gates: Interactive app walkthrough

OWNS: components/daybreak/WelcomeGuide.tsx, components/daybreak/DaybreakApp.tsx, app/daybreak.css, scripts/verify-app-walkthrough.mjs, docs/app-walkthrough/**

Scope: Replace the dated first-visit guide with a reusable, image-led interactive walkthrough of Daybreak's major live features.

- [x] G1: The walkthrough covers discovery, company context, exact instrument review, private holdings intelligence, holder Circles, and interest personalization with truthful capability boundaries.
  CHECK: node scripts/verify-app-walkthrough.mjs
  EXPECT: app walkthrough verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=0b51c871f7ea796fe68765cfd3d0749a0b7227ee0677d0d3ba0b4514819e742a; exit=0; EXPECT=matched; output-sha256=2f4cdf3cfa95ca2bb7b332fbad4c4d981c56b57d4fed8c1af973766e1a6700ae; output-bytes=36; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: The walkthrough is operable with buttons, progress controls, keyboard arrows, and touch swipes, and can be reopened after onboarding.
  CHECK: npm test
  EXPECT: acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e4cae9dfe2744e9e7883703f2050601b4208ea0541089c4a76e009905a9a4579; exit=0; EXPECT=matched; output-sha256=6a81898639b94f228b521f9adcdcb260dc811e20680cbca85c1ae9ce21e491fc; output-bytes=2618; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The walkthrough and app-shell integration type-check.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The responsive walkthrough, built from Daybreak's existing visual assets, compiles in a production build.
  CHECK: npm run build
  EXPECT: Generating static pages
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d813e15a0f156714ca07a24e96ccbede7f3949d554a5c0f517f628347f886c46; exit=0; EXPECT=matched; output-sha256=66ac58f6568bd1372c7cf0c1bce0086f30596db3716d6f3845d8b109bc62e74c; output-bytes=7210; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
