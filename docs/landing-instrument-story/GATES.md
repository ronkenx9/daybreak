# Gates: Landing instrument story

OWNS: app/page.tsx, app/layout.tsx, app/daybreak.css, components/daybreak/LandingInstrumentStory.tsx, components/daybreak/LandingStories.tsx, components/daybreak/LocaleProvider.tsx, scripts/verify-landing-instrument-story.mjs, docs/landing-instrument-story/**

Scope: Adjust the landing experience to market Daybreak's company-first, cross-network instrument comparison and reviewed-quote flow accurately across desktop and mobile.

- [x] G1: The landing page tells one complete company-to-Circle story, visibly distinguishes Base/Coinbase and Solana/Backed instruments, and sends the user into a real AAPL stock workspace.
  CHECK: node scripts/verify-landing-instrument-story.mjs
  EXPECT: landing instrument story verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=1c22e5d6de580d2aaff5a7c1926b7dd5be0386ed21221a3be260bacc175d3714; exit=0; EXPECT=matched; output-sha256=bc7864cf306d9f03f85c1a68d7c8927b7cb48c1c30cce9ebe772234335b5c9dd; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Existing product behavior remains covered after the marketing and UX copy changes.
  CHECK: npm test
  EXPECT: acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e4cae9dfe2744e9e7883703f2050601b4208ea0541089c4a76e009905a9a4579; exit=0; EXPECT=matched; output-sha256=771733c7f3f7f0d5720361b2c66ba9a9ce576e30872ec4e336101f22c1b2cb54; output-bytes=2523; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The landing experience and localized copy type-check across the application.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The responsive marketing pass compiles in a production build.
  CHECK: npm run build
  EXPECT: Generating static pages
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d813e15a0f156714ca07a24e96ccbede7f3949d554a5c0f517f628347f886c46; exit=0; EXPECT=matched; output-sha256=601e8afb04f8075cc07a7cf204d73ed95e1852febe08f2eff3d07c36c711fd35; output-bytes=7208; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
