# Daybreak iOS app

Daybreak's native iOS client lives in `mobile/`. It uses Expo SDK 57 and React Native. The first release keeps the web product's five destinations and the current Daybreak visual system: electric blue, porcelain, dark ink, rounded controls, concise cards, and an automatic dark palette. The app icon is generated from the existing Daybreak mark, not a new visual identity.

## What works

- **Discover:** Search the supported Base stock token catalog, see the matching Solana xStock where available, and read source-labeled equity reference prices. The app never calls a reference price a token execution quote.
- **Circles:** Browse active public circles and member counts without an account. Membership, eligibility, wallet state, and personal circle content are not exposed by the public endpoint.
- **Conviction:** Browse public human/agent theses and filter paper versus live. Read the thesis and invalidation in a native sheet. The action opens the exact thesis in the web product for review and confirmation.
- **Stats:** Read live Daybreak network counts.
- **You:** Sign-in handoff to the web product, where profile, holdings, saved companies, and wallet verification already work. The native view does not invent a balance.

Native sign-in, wallet connection, trades, notifications, and App Store distribution are separate implementation milestones. The first client does not store credentials or private account data on-device. Paper practice is labeled as simulated and remains distinct from live markets.

Dependency review on 2026-09-20 found no high or critical npm advisories. npm flags 10 moderate advisories in Expo's transitive build tooling, centered on `xcode`/`uuid`; its suggested Expo 46 downgrade is incompatible with the SDK 57 app. Reassess those advisories before a signed distribution build.

## Run and verify

```bash
cd mobile
npm ci
npm run typecheck
npm run export:ios
npm run ios
```

`npm run ios` requires an installed Xcode/iOS Simulator. If Xcode is unavailable, `npm run start` supplies an Expo Go QR code for an iPhone on the same network. A signed TestFlight/App Store binary requires configuring EAS credentials and an Apple developer account. The app reads `https://www.daybreakcircles.lol`; deploy the companion web API routes before testing it against production.

The public APIs are `GET /api/mobile/companies`, `GET /api/circles/public`, existing `GET /api/theses`, `GET /api/equity-prices`, and `GET /api/stats`. The two new endpoints contain no private account fields. `mobile/scripts/verify-mobile.mjs` covers feed validation and the allowlisted web handoffs.

To regenerate the iOS icon from the checked-in brand SVG, run `node mobile/scripts/generate-assets.mjs` from the repository root, where the web dependency `sharp` is installed.

## Next native milestone

Add a native account session through Daybreak's existing Privy identity, then authenticated profile/holdings and holder-only Circles. Only after wallet signing, trade review, quote expiry, receipts, and recovery work on iOS should paper or live execution move into the native app.
