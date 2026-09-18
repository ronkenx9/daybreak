# Gates: Company-routed public and private Circle news

OWNS: lib/assets/companies.ts, lib/solana/prestocks-registry.ts, lib/db/repo.ts, lib/news/url.ts, lib/news/company-routing.ts, app/api/solana/holdings/sync/route.ts, app/api/circles/news/route.ts, app/api/news/comments/route.ts, components/daybreak/CircleNews.tsx, components/daybreak/CirclesHub.tsx, scripts/audit-core.cjs, scripts/verify-company-circle-news.mjs, docs/company-circle-news/**

Scope: Let an authenticated PreStocks holder enter a private-company Circle and receive sourced private-company news and Circle-scoped discussion through the same company context used for public stocks.

- [x] G1: The canonical company registry maps every approved PreStocks mint to a private company without treating its provider symbol as a public ticker.
  CHECK: node scripts/verify-company-circle-news.mjs registry
  EXPECT: private company registry verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=bbad70210e6e911822fce6bfa43e3664725b7dac1d93556ba361130a0c0fb4b1; exit=0; EXPECT=matched; output-sha256=b285e9b0ed628a00ab4be992f7dc89b1d786ef8bd7ed9aa4287bd70246f1118b; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: One authenticated Solana verification refreshes xStocks and PreStocks independently, preserving valid evidence when either provider read fails.
  CHECK: node scripts/verify-company-circle-news.mjs solana
  EXPECT: unified Solana evidence verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=27b0775d36e2fde082657a9871c2f6ba6c3f3ca650488ba59829d909b3549029; exit=0; EXPECT=matched; output-sha256=b69bd7723ffbb31e603f654fc7c7bdf02ef55e3acb8e0be9b277a2f6c1e98c96; output-bytes=44; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: Circle feeds and comments route approved public companies to Finnhub and approved private companies to PreStocks/GDELT while preserving existing public article identities.
  CHECK: node scripts/verify-company-circle-news.mjs news
  EXPECT: company news routing verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=400b32eee3dfd0d545102a1ecb1ba45617c19512ad0a1cbcf6f18598292621cc; exit=0; EXPECT=matched; output-sha256=c8e70cc38e90f9b95a86fee12066e92effe0ac3b9fca4ac0c776d0189fbff65f; output-bytes=41; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The Daybreak acceptance audit and TypeScript validation pass.
  CHECK: npm test && npm run type-check && echo company circle news static checks passed
  EXPECT: company circle news static checks passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=5c6d7ce097278fa875577737ff04750126715a11ceda5f3dceff4930646f3819; exit=0; EXPECT=matched; output-sha256=ddd00b185261c1dcd62d228016fed9e2dbcd5e9366aefd2aacca84ea45432567; output-bytes=2297; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G5: The production Next.js build compiles with private-company Circles and news.
  CHECK: npm run build && echo company circle news production build passed
  EXPECT: company circle news production build passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=45fccc49b399be2de10bcbdf8b554bf768efe516bf84738b6cec5f7bb07f9e40; exit=0; EXPECT=matched; output-sha256=02e7c440912ed610210477afffc5bc3f18fdd9a72477f51dad753173dfc6919b; output-bytes=7184; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
