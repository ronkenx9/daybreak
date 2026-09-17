# Gates: Consumer profile dashboard redesign

OWNS: components/daybreak/ProfileOverview.tsx, components/daybreak/DaybreakApp.tsx, app/daybreak.css, scripts/verify-profile-dashboard.mjs, docs/profile-dashboard-redesign/GATES.md

Scope: Redesign the You page around profile identity, real portfolio balance, and compact holdings while preserving account settings and responsive behavior.

- [x] G1: The profile first viewport renders identity, balance, and at most four real holdings with clear actions and honest disconnected/loading/error states.
  CHECK: node scripts/verify-profile-dashboard.mjs
  EXPECT: profile dashboard structure verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=9e4c5457a8713518e4f5d630542d3841037b3b6736e22b1c8275fe8f7b4b7c9c; exit=0; EXPECT=matched; output-sha256=f3b1447e2f966d411b58deeb8041233ba176c84f0c585ab59398f32e8c52030c; output-bytes=37; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: The redesigned profile remains type-safe.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  EVIDENCE: automatic-evidence=v1; definition-sha256=e1bbd01befe5acfb860b82af01d607e828fa0400877da3c00b5ac1118dbee533; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld/docs/profile-dashboard-redesign; path=6301b3dce452/22 entries

- [x] G3: Existing application acceptance checks remain green.
  CHECK: npm test
  EXPECT: 31 acceptance groups passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=14db46a761d7d1ef0fa5ed3617c32ebfb00d8e574201cd520034c90d439742e5; exit=0; EXPECT=matched; output-sha256=33d4bd8f605615349213e07a0e923bea6bfcb2f6f290d9ca545058220c3d8864; output-bytes=1938; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld/docs/profile-dashboard-redesign; path=6301b3dce452/22 entries

- [x] G4: Desktop and mobile review confirms the profile hero is the first dominant surface, controls are usable, and no horizontal overflow appears.
  EVIDENCE: Reviewed /app/profile in the in-app browser at 877px and local Chrome at 500x844. The PFP, identity, balance, disconnected state, holdings strip, and actions remain readable without horizontal overflow; the oversized DAYC chart no longer appears in the profile flow.
