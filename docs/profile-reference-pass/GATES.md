# Gates: Profile reference pass

OWNS: components/daybreak/DaybreakApp.tsx, components/daybreak/ProfileOverview.tsx, app/daybreak.css, scripts/verify-profile-reference.mjs, docs/profile-reference-pass/GATES.md

Scope: Consolidate the You page into the supplied consumer profile hierarchy while preserving profile editing and detailed holdings as on-demand interactions.

- [x] G1: The profile page has one primary overview, an external action row, and a two-column preferences/saved dashboard instead of stacked duplicate profile documents.
  CHECK: node scripts/verify-profile-reference.mjs
  EXPECT: profile reference structure verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=491e79a646fc7716d84da6ff5e6e9a3f83768a5482cdb5821326be28d9ce36d0; exit=0; EXPECT=matched; output-sha256=7e1efca88d4e4503e9405c7cf6ba3d42a030fe7bada76502c7c715885e23a63d; output-bytes=37; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Profile editing and extended holdings remain accessible on demand without occupying the default page flow.
  CHECK: node scripts/verify-profile-reference.mjs --interactions
  EXPECT: profile interactions verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=ad77e616be84839e942b7181830b2ccf1f6962d35e86b445e27425949c7760da; exit=0; EXPECT=matched; output-sha256=e126655b658fdf73feae3749713ef210de920ad1466b32afc677503fdf8caa9e; output-bytes=30; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The profile consolidation is type-safe.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: Existing application acceptance checks remain green.
  CHECK: npm test
  EXPECT: 31 acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=786b7052039d2528e158940bbf91cb0e59ade6749a419977ff76f84c2a0d41b5; exit=0; EXPECT=matched; output-sha256=33d4bd8f605615349213e07a0e923bea6bfcb2f6f290d9ca545058220c3d8864; output-bytes=1938; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
