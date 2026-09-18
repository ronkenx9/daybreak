# Gates: Thesis persistence and APIs

OWNS: lib/db/schema.ts, lib/db/repo-theses.ts, drizzle/0017_thesis_markets.sql, app/api/theses/**, lib/theses/model.ts, scripts/verify-thesis-persistence.mjs

Scope: Persist immutable theses, exact markets and recoverable intent-bound operations behind authenticated APIs.

- [x] G1: Schema and migration enforce immutable identity, exact market uniqueness, ownership and public/private boundaries.
  CHECK: node scripts/verify-thesis-persistence.mjs schema
  EXPECT: thesis persistence schema verified
  CWD: ../../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=24d5e0d7cee832507bebf13b7f090e78f9a232932fda509bc0e62cef753103ad; exit=0; EXPECT=matched; output-sha256=2926fd15ea6f5e1400f05f3fccc0227367985b5f49d9cd4f491bfaaf98546c34; output-bytes=35; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
- [x] G2: Draft, preview, submit, list and detail APIs validate bounded input and derive acting user from verified auth.
  CHECK: node scripts/verify-thesis-persistence.mjs api
  EXPECT: thesis API validation verified
  CWD: ../../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=f0d917c943e6a917d04872d4b22382f607a56a869241b99d8a64890370c6382b; exit=0; EXPECT=matched; output-sha256=1c4117112bdc76d82c0c7382f5bb5cad44471ca39519f95c282ea00a42671ffb; output-bytes=31; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
- [x] G3: Duplicate/replayed/altered intents fail closed and uncertain submissions recover before rebuild.
  CHECK: node scripts/verify-thesis-persistence.mjs intent
  EXPECT: thesis signed intent verified
  CWD: ../../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=82909e4c53ff319c4ccfe67380e89e86c95fbbbe7017ea4ea5e1fa3abf510e96; exit=0; EXPECT=matched; output-sha256=fe82265eff705889a2b97e49d1a507102a3515412a8fcc3a4195d3e6ef3d19bd; output-bytes=30; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
- [x] G4: Repository acceptance tests, typecheck and migration checks pass.
  CHECK: npm test && npm run type-check
  EXPECT: acceptance groups passed
  CWD: ../../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d5e0ae47e86db03c322cdda89149f6e6ecacb6bfaa8fcde96c45fe0ad156feb6; exit=0; EXPECT=matched; output-sha256=16dff6f90e8f1a73d1cf3241365ca5af8e5d79a174ff43028040c789cba33edb; output-bytes=2663; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
