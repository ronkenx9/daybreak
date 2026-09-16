# Gates: publish Daybreak mobile build plan

OWNS: docs/MOBILE-BUILD-PLAN.md, docs/mobile-mockups/README.md, docs/mobile-mockups/*.png

Scope: Publish one GitHub-renderable mobile build plan with the approved screen boards, mascot motion guidance, implementation order, and truthful data requirements.

- [x] G1: The build plan embeds all seven approved visual boards using repository-relative paths that exist.
  CHECK: node scripts/verify-mobile-build-plan.mjs
  EXPECT: mobile build plan verification passed
  CWD: ../..
  EVIDENCE: mobile build plan verification passed; npm test 31 groups passed; type-check clean

- [x] G2: The plan maps all 15 numbered screens and eight mascot states to product behavior and acceptance criteria.
  CHECK: node scripts/verify-mobile-build-plan.mjs
  EXPECT: mobile build plan verification passed
  CWD: ../..
  EVIDENCE: mobile build plan verification passed; screens 01-15 and 8 mascot states present with foundations-first order

- [x] G3: Only mobile-plan artifacts are staged and committed; unrelated Muse and workspace changes remain untouched.
  EVIDENCE: staged docs/MOBILE-BUILD-PLAN.md, docs/mobile-mockups/*.png+README+GATES+PUBLISH-GATES, scripts/verify-mobile-build-plan.mjs only; left app/api/muse route, MuseCreate.tsx, .claude/, PLAN.md, stocklana-foundation/, exports/ unstaged/untracked

- [x] G4: The committed plan and images are available on the configured GitHub remote through a shareable URL.
  EVIDENCE: pushed to origin/main; share https://github.com/ronkenx9/daybreak/blob/main/docs/MOBILE-BUILD-PLAN.md
