# Gates: Thesis-market product integration

OWNS: .unlazy/thesis-markets/gates/node-1.2.md

Scope: Verify the UX and trading lifecycle compose without false market or execution claims.

- [x] G1: Leaf 1.2.1 and 1.2.2 are independently reverified.
  EVIDENCE: Browser, verifier, typecheck and production build passes completed on 2026-09-18.
- [x] G2: Every displayed review field is backed by the accepted quote/intent and every trade phase has an honest state.
  EVIDENCE: Review payload is produced from the same transaction quote persisted for later signature verification.
