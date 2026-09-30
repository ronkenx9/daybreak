# Gates: Base stock expansion and launch poster

OWNS: lib/base/**, lib/assets/companies.ts, lib/news/provider.ts, components/daybreak/**, public/assets/posters/**, scripts/verify-base-stock-expansion.mjs, docs/BASE-STOCK-EXPANSION-2026-09-30.md

Scope: Add every newly live Coinbase tokenized stock on Base to Daybreak through a verified, resilient catalog and deliver a polished Daybreak campaign poster announcing the expansion.

- [x] G1: Daybreak's stock catalog includes the newly live Base stocks, uses unique verified addresses, and no longer presents registered zero-supply tokens as live.
  CHECK: node scripts/verify-base-stock-expansion.mjs
  EXPECT: base stock expansion verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=7dffea199310f47c969af164e7612d0182cc0fa77377e21140f1025b6487189a; exit=0; EXPECT=matched; output-sha256=2f821ca7b186c6cc4fd1f53229770236814980c60d7d2bf3a37694014f834757; output-bytes=41; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=ebf9417eb239/22 entries

- [x] G2: The expanded catalog is consumed by stock discovery, detail, holdings, pricing, and trade-link paths without type errors.
  CHECK: ./node_modules/.bin/tsc --noEmit && node -e "console.log('dayworld typecheck passed')"
  EXPECT: dayworld typecheck passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=104efe9e489c03cc9a678af956497b004f6b8db8ac0134d83582a8657f14e055; exit=0; EXPECT=matched; output-sha256=941eccce2d5ac42ae4dc4707574178046afec91171770dc38ead99742de9f770; output-bytes=26; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=ebf9417eb239/22 entries

- [x] G3: The complete Daybreak production application builds with the expanded catalog.
  CHECK: ./node_modules/.bin/next build
  EXPECT: Compiled successfully
  EVIDENCE: automatic-evidence=v1; definition-sha256=6d44a05f7b0fe1fc982cafe144a919cc4f73767e2acf04d84c1941575ef86b73; exit=0; EXPECT=matched; output-sha256=18581697822a8db3b9ee1bb0d5c742c053c20160340c800a2fb4ef95cb51b476; output-bytes=13168; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=ebf9417eb239/22 entries

- [x] G4: A 4:5 Daybreak campaign poster exists in the product media library and visibly announces the verified new stock cohort using Daybreak's established visual language.
  EVIDENCE: Reviewed `public/assets/posters/base-stocks-wave-2026-09-30.png` at 1122×1402: it preserves the Daybreak mascot, cobalt sunrise campaign system and exact 28-stock launch headline, with company logo emblems on the orbiting tiles instead of ticker text.
