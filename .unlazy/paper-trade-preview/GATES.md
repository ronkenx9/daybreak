# Gates: Paper trade preview polish

OWNS: components/daybreak/theses/PaperTradingMode.tsx, app/daybreak.css

Scope: Make the public Paper quote preview compact, readable, and clear about input/output units, timing, and simulation while preserving quote and execution behavior.

- [x] G1: Paper quote preview renders a prominent receive amount, aligned fee/impact/minimum rows with units, an expiry state, and a clear action.
  EVIDENCE: Local production browser preview of 1 NVDAx displayed 386.6398 RUNWAY estimated receive, 0.02 NVDAx fee, 0.39% impact, 382.7734 RUNWAY minimum, live countdown, and an expired refresh action.

- [x] G2: TypeScript accepts the updated Paper trade component.
  CHECK: npx tsc --noEmit && node -e "console.log('TSC_OK')"
  EXPECT: TSC_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=1bd6b1547bfb1d3f762ebe209e9328afa64590a0286fbd1e4624936b970cc261; exit=0; EXPECT=matched; output-sha256=d018f66bb24b65f8f3c86936c97cc0c033c796f2f7b335753a186d3d2c5818a4; output-bytes=7; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld/.unlazy/paper-trade-preview; path=6301b3dce452/22 entries

- [x] G3: The production build succeeds.
  CHECK: npm run build && node -e "console.log('BUILD_OK')"
  EXPECT: BUILD_OK
  EVIDENCE: automatic-evidence=v1; definition-sha256=4628922d8bd37a4e72b367d3d556bc52121d61226d142fd8ad50a4f194bfc00c; exit=0; EXPECT=matched; output-sha256=54367f0fa1972c2ce3a9f3f17176646b7ac53eac59aa00297965de98b50d1738; output-bytes=10932; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld/.unlazy/paper-trade-preview; path=6301b3dce452/22 entries

- [x] G4: Desktop, mobile, and dark-mode browser checks show the preview without overflow or stacked label/value text.
  EVIDENCE: Browser screenshots reviewed at 390px light/dark and 1280px light. At 390px, document scrollWidth and innerWidth were both 390, the amount field and preview aligned within the 350px market card, and the quote rows remained horizontal.
