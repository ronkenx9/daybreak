# Gates: Thesis-market cutover integration

OWNS: .unlazy/thesis-markets/gates/node-1.3.md

Scope: Verify the new creation path fully replaces old launchers without losing legacy access.

- [x] G1: Leaf 1.3.1 is independently reverified.
  EVIDENCE: Browser verified Conviction navigation, ten-pair composer and context-preserving legacy redirect.
- [x] G2: Fresh creation has one path and confirmed historic assets remain readable/actionable.
  EVIDENCE: Fresh legacy writes return 410 while pool reads and legacy persistence remain untouched.
