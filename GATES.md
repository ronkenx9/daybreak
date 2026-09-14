# Gates: x402 pairing intelligence and SEO release

OWNS: GATES.md, package.json, package-lock.json, .env.example, app/api/v1/market/pairing-opportunities/**, app/layout.tsx, app/robots.ts, app/sitemap.ts, app/manifest.ts, app/opengraph-image.tsx, app/app/layout.tsx, lib/data/**, lib/x402/**, public/llms.txt, scripts/verify-x402-seo.mjs, scripts/verify-live-x402.mjs, docs/X402_DATA_API.md

Scope: Ship a production-safe paid pairing-intelligence endpoint and complete Daybreak's search, social-share, and agent-discovery metadata without disturbing unrelated working-tree changes.

- [x] G1: The x402 endpoint rejects unpaid requests with a standards-shaped 402 challenge and releases data only after SDK-backed settlement succeeds.
  CHECK: node scripts/verify-x402-seo.mjs x402
  EXPECT: x402 verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=3114f43b58532891d8d5ca457b5e2beca744dff9bf1d1d25c93ff4091c11e3a7; exit=0; EXPECT=matched; output-sha256=40310af4b9ea04704822729573434d82e770da5c7a5e2c2ebde1bf0164138c6e; output-bytes=25; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=74c3116f42e3/22 entries

- [x] G2: Pairing opportunities are derived, bounded, provenance-labelled records rather than a raw upstream-data passthrough.
  CHECK: node scripts/verify-x402-seo.mjs data
  EXPECT: pairing data verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=da9fed6ef81557b2028c8a085cdeb18e286fdc9d38d16fbf1937c6b29b7f52c9; exit=0; EXPECT=matched; output-sha256=79527dc40229b5ef761b4eaa0b327989b0cb971d41b8a2f3992c3bc3e285a2ea; output-bytes=33; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=74c3116f42e3/22 entries

- [x] G3: Public pages expose canonical, robots, sitemap, manifest, Open Graph, X card, structured-data, and agent-readable discovery metadata.
  CHECK: node scripts/verify-x402-seo.mjs seo
  EXPECT: seo verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=35acfd5f3c8785e9cc00348984cea2eabb7f29647a466f59d6952624654b7cd8; exit=0; EXPECT=matched; output-sha256=0edc1fa035fdaa89e9a6c467a7d95dfcc8035a3b3dd01b6e44e2cd1abba764d1; output-bytes=24; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=74c3116f42e3/22 entries

- [x] G4: The existing Daybreak automated audit remains green.
  CHECK: npm test
  EXPECT: 31 acceptance groups passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=14db46a761d7d1ef0fa5ed3617c32ebfb00d8e574201cd520034c90d439742e5; exit=0; EXPECT=matched; output-sha256=33d4bd8f605615349213e07a0e923bea6bfcb2f6f290d9ca545058220c3d8864; output-bytes=1938; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=74c3116f42e3/22 entries

- [x] G5: The complete application remains type-safe and production-buildable.
  CHECK: npm run type-check && npm run build
  EXPECT: Compiled successfully
  EVIDENCE: automatic-evidence=v1; definition-sha256=22a8e9c83f37ce1bdc8c2588097b013e07f413e0614e579a2a344ea245ae6b85; exit=0; EXPECT=matched; output-sha256=6533817a8b236b1a740f7cc532eb6cb35dfc3c168f737e023c9569ff853856c0; output-bytes=5498; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=74c3116f42e3/22 entries

- [x] G6: The previously completed Daybreak and Muse translation commits are present on their tracked remotes.
  EVIDENCE: `origin/main` resolves to Daybreak `b2872ec1deb33108d6591d9a0af7a495765c2bb7` and Muse `090328ef9b07cd5c73ccf1826a7eb41b63b47c72` after successful pushes on 2026-09-14.

- [x] G7: Production advertises the owner-provided seller address in a Base x402 v2 challenge at the configured 0.005 USDC price.
  CHECK: node scripts/verify-live-x402.mjs 0xbF676Ef8A8886cd217265fD534987344ea0cc84B
  EXPECT: live x402 seller verification passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=2b573422c1a4e5de565862de7b679c76b4e863494e37199399f4843b4f61b9be; exit=0; EXPECT=matched; output-sha256=e05868d79aede1b1e3ed71017734ed8a4c488f8150925f09005988fd54847c00; output-bytes=37; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=74c3116f42e3/22 entries
