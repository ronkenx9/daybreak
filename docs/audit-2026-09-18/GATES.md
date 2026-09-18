# Gates: Daybreak audit

- [x] G1: Current regression suite passes.
  CHECK: npm test
  EXPECT: acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e4cae9dfe2744e9e7883703f2050601b4208ea0541089c4a76e009905a9a4579; exit=0; EXPECT=matched; output-sha256=6a81898639b94f228b521f9adcdcb260dc811e20680cbca85c1ae9ce21e491fc; output-bytes=2618; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
- [x] G2: Current application type-checks.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
- [x] G3: Audit report records reproducible findings and limitations.
  CHECK: node -e "const s=require('fs').readFileSync('docs/audit-2026-09-18/REPORT.md','utf8'); if(!s.includes('Findings')||!s.includes('Limitations')) process.exit(1); console.log('audit report present')"
  EXPECT: audit report present
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=f4d270f36d85be32d80ed9c3688f4fcb85f4238638ad8a38941213bc93828d80; exit=0; EXPECT=matched; output-sha256=40029b35c213b308be471d532712d83130d1dd6dd5bebb03cd23891705992820; output-bytes=21; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
