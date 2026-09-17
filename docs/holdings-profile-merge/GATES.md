# Gates: Holdings and profile merge

OWNS: components/daybreak/DaybreakApp.tsx, app/app/holdings/page.tsx, app/daybreak.css, scripts/verify-holdings-profile-merge.mjs, docs/holdings-profile-merge/GATES.md

Scope: Merge portfolio and identity into the You destination while preserving the old holdings URL as a redirect.

- [x] G1: Main navigation has one You destination, and the merged profile renders portfolio and identity content without duplicate Connect wallet buttons.
  CHECK: node scripts/verify-holdings-profile-merge.mjs
  EXPECT: holdings/profile merge verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d2e6f557848287fe9a41d6d73634a8a1b6fe29ffa133427af1b2231dfebd3f9f; exit=0; EXPECT=matched; output-sha256=bd89f60d1b98bcdf99cd31f46519ddd4b6f64647c60326ea691396873b678037; output-bytes=32; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: The merged application remains type-safe.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  EVIDENCE: automatic-evidence=v1; definition-sha256=e1bbd01befe5acfb860b82af01d607e828fa0400877da3c00b5ac1118dbee533; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld/docs/holdings-profile-merge; path=6301b3dce452/22 entries

- [x] G3: Existing application acceptance checks remain green.
  CHECK: npm test
  EXPECT: 31 acceptance groups passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=14db46a761d7d1ef0fa5ed3617c32ebfb00d8e574201cd520034c90d439742e5; exit=0; EXPECT=matched; output-sha256=33d4bd8f605615349213e07a0e923bea6bfcb2f6f290d9ca545058220c3d8864; output-bytes=1938; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld/docs/holdings-profile-merge; path=6301b3dce452/22 entries

- [x] G4: Desktop and mobile browser review confirms the merged You page is readable, navigable, and free of horizontal overflow.
  EVIDENCE: Reviewed /app/profile in the in-app browser at 877px and a local Chrome capture at 500x844. The five-item navigation, merged hero, DAYC panel, and profile content remain readable without horizontal overflow; /app/holdings lands on /app/profile.
