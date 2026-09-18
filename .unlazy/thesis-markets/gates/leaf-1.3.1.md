# Gates: Thesis-market cutover

OWNS: components/daybreak/DaybreakApp.tsx, components/daybreak/PreStocksDiscovery.tsx, components/daybreak/ConvictionMarket.tsx, components/daybreak/LaunchPortal.tsx, components/daybreak/DbcLaunchPanel.tsx, app/api/solana/dbc/**, app/api/token-launches/**, components/daybreak/LocaleProvider.tsx, components/daybreak/WelcomeGuide.tsx, scripts/audit-core.cjs

Scope: Make Conviction the sole creation path while preserving legacy read/receipt/exit behavior and integrating Daybreak surfaces.

- [x] G1: App navigation and all product handoffs use Conviction; no generic or USDC belief-market creation remains.
  EVIDENCE: Navigation, stock/prestock handoffs and landing page point to `/app/conviction`; the legacy path redirects with query context.
- [x] G2: Legacy write endpoints return retired responses while existing receipts/read paths remain accessible.
  EVIDENCE: Six legacy mutation endpoints return HTTP 410; DBC pool reads and stored historical tables remain intact.
- [x] G3: Circles, companies, profile, Guide, landing/localized copy and analytics reflect thesis markets accurately.
  EVIDENCE: Localized navigation, company handoffs and a dedicated landing section now explain exact stock-token thesis pairing.
- [ ] G4: Acceptance tests, typecheck, build and browser checks pass without unrelated-work regressions.
  CHECK: npm test && npm run type-check && npm run build
  EXPECT: acceptance groups passed
  EVIDENCE: pending
