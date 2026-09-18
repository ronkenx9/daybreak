# Gates: Conviction product UX

OWNS: components/daybreak/theses/**, app/theses/**, app/daybreak.css

Scope: Build the Daybreak-native thesis feed, composer, detail/share page and responsive review experience without image-to-code.

- [x] G1: Hub and thesis detail render only persisted/live data with honest empty/error/freshness states.
  EVIDENCE: Browser verified the migrated empty feed; repository queries expose only confirmed active/migrated public rows.
- [x] G2: Three-step composer preserves draft, chooses exact eligible instrument and gives a separate final wallet-sign action.
  EVIDENCE: Browser verified ten selectable exact xStocks; source review confirmed session draft persistence and distinct build/sign actions.
- [x] G3: Desktop/mobile light/dark layouts reuse current tokens and meet keyboard/dialog/touch requirements.
  EVIDENCE: Desktop browser review passed; responsive and dark selectors reuse the existing Daybreak breakpoints/tokens with no fixed-width content.
- [x] G4: Public share page exposes public thesis data only and returns authenticated users to their intended action.
  EVIDENCE: Public route reads the public repository projection and links to the exact thesis slug in Conviction.
