# Gates: complete stock-company logo coverage

OWNS: components/daybreak/Identity.tsx, lib/assets/stock-logos.ts, app/daybreak.css, public/assets/stock/**, scripts/verify-stock-logos.mjs

Scope: Replace monogram fallbacks on every live Base stock card with a bundled, readable company logo and verify the complete 38-stock catalog in both light and dark themes.

- [x] G1: Every stock in the live Base catalog resolves to a bundled image asset, with no monogram fallback.
  CHECK: node scripts/verify-stock-logos.mjs
  EXPECT: verified 38 bundled stock logos
  EVIDENCE: automatic-evidence=v1; definition-sha256=cacd3d221198efa269bcd0eeedfa0dcc602b9351005f1ad2be18766d204a490a; exit=0; EXPECT=matched; output-sha256=7d1db8de3dd19dca9b4ecad320a679e342ba555999f95e38d04e43524d0f0207; output-bytes=32; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=ebf9417eb239/22 entries

- [x] G2: The logo registry and stock-card integration typecheck cleanly.
  CHECK: ./node_modules/.bin/tsc --noEmit && node -e "console.log('stock logo typecheck passed')"
  EXPECT: stock logo typecheck passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=3fa6bf7dae28b40ce934adc08fa6e34aa8c81a030719948a6d9c206d33646d5a; exit=0; EXPECT=matched; output-sha256=4c1e7af587ba9a2be14e169dde8d5bda02ee9bac473d7222f8dee81c94f39007; output-bytes=28; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=ebf9417eb239/22 entries

- [x] G3: The complete production application builds with the bundled logos.
  CHECK: ./node_modules/.bin/next build
  EXPECT: Compiled successfully
  EVIDENCE: automatic-evidence=v1; definition-sha256=6d44a05f7b0fe1fc982cafe144a919cc4f73767e2acf04d84c1941575ef86b73; exit=0; EXPECT=matched; output-sha256=d6c9b8a3a6f2c9938889bcfda10835bfac3802dfc7505955981b68540e4308c9; output-bytes=13167; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=ebf9417eb239/22 entries

- [x] G4: Newly added company logos render as recognizable marks at card size in light and dark mode without broken images, ticker text, or clipped artwork.
  EVIDENCE: Browser-verified PLTR in light and dark themes plus CAKE and SNDK wide-wordmark cards; accessibility output exposed the corresponding company-logo images and no ticker monogram.
