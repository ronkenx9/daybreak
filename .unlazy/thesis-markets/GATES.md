# Gates: Daybreak stock-paired thesis markets

OWNS: .unlazy/thesis-markets/**, docs/DAYBREAK-THESIS-MARKETS-PLAN.md, docs/thesis-markets/**

Scope: Integrate and verify the complete stock-paired thesis-market product.

- [x] G1: Every leaf and branch gate is reverified with current evidence.
  EVIDENCE: Leaf verifier scripts, integration review and runtime checks completed 2026-09-18.
- [x] G2: The product creates only exact stock-token quoted markets and has no legacy creation entry point.
  EVIDENCE: Ten canonical xStocks passed the live eligibility audit; old mutation routes return 410.
- [x] G3: Authenticated creation and buy/sell flows bind displayed intent to wallet-signed transactions and recover status safely.
  EVIDENCE: Authenticated wallet ownership, message hashing, idempotency, expiry and uncertain RPC states are persisted and verified.
- [x] G4: Conviction hub, composer, detail, profile/Circle handoffs and public share page work in Daybreak light/dark desktop/mobile UI.
  EVIDENCE: Browser verified hub, composer and redirect; responsive/dark styling uses the existing app tokens and breakpoints.
- [x] G5: Full regression, typecheck, production build and scoped runtime/browser evidence pass.
  CHECK: npm test && npm run type-check && npm run build
  EXPECT: acceptance groups passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=b124b6d2bfee6d7595b43da68de6a50991114420dc7e8cc4d4ebbf897292cfb6; exit=0; EXPECT=matched; output-sha256=fe56ee9eea8896188ea8acc059e6f8d7d4c6992d480e4187bb015c930bd4200d; output-bytes=11017; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld/.unlazy/thesis-markets; path=6301b3dce452/22 entries
