# Gates: DAYC sparkline and PreStocks quick actions

OWNS: components/daybreak/DaybreakTokenCard.tsx, components/daybreak/PreStocksDiscovery.tsx, app/daybreak.css, docs/dayc-prestock/GATES.md

Scope: Add a live 24-hour sparkline to the featured DAYC card and a direct, accessible PreStocks trade action to every pre-IPO card.

- [x] G1: The featured DAYC card renders the shared sparkline using the canonical DAYC token address.
  CHECK: node -e "const fs=require('node:fs');const s=fs.readFileSync('components/daybreak/DaybreakTokenCard.tsx','utf8');if(!s.includes(\"import Sparkline from './Sparkline'\")||!s.includes('token={DAYBREAK_TOKEN.address}')||!s.includes('db-meme-card-spark'))process.exit(1);console.log('DAYC sparkline verification passed')"
  EXPECT: DAYC sparkline verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=1a410988ae237208adb136fa8dcc180dd1e2df9b95c2bf4415d5d4cf1690a152; exit=0; EXPECT=matched; output-sha256=359ab31a650913f493afa7ef8219cf13c77e34ec1ad4b4db9053623f498e0b6f; output-bytes=35; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Each pre-IPO card exposes a separate external trade link without nesting that link inside the detail button, and the card actions have light and dark styling.
  CHECK: node -e "const fs=require('node:fs');const s=fs.readFileSync('components/daybreak/PreStocksDiscovery.tsx','utf8');const c=fs.readFileSync('app/daybreak.css','utf8');const button=s.indexOf('className=\"db-prestock-open\"');const close=s.indexOf('</button>',button);const link=s.indexOf('className=\"db-prestock-trade\"');if(button<0||close<button||link<close||!s.includes('href={p.externalUrl}')||!s.includes('target=\"_blank\"')||!s.includes('rel=\"noopener noreferrer\"')||!c.includes('.db-prestock-trade:hover')||!c.includes('[data-theme=\"dark\"] .db-prestock-trade'))process.exit(1);console.log('PreStocks quick-action verification passed')"
  EXPECT: PreStocks quick-action verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=65b623d9cf8141e41fc9cc3528b143020d52b9d1a7f35e574d7decfa58920f84; exit=0; EXPECT=matched; output-sha256=8920781703005787489b0b75937a74ac303102487ed7442740d78500f90415f6; output-bytes=43; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The Daybreak acceptance audit remains green.
  CHECK: npm test
  EXPECT: acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e4cae9dfe2744e9e7883703f2050601b4208ea0541089c4a76e009905a9a4579; exit=0; EXPECT=matched; output-sha256=33d4bd8f605615349213e07a0e923bea6bfcb2f6f290d9ca545058220c3d8864; output-bytes=1938; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The complete application remains type-safe and production-buildable.
  CHECK: npm run type-check && npm run build
  EXPECT: Compiled successfully
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=089ad4e936ed44b49d30d65e2b7303e4583bc80bf1c899bb9b838dcf572be1fb; exit=0; EXPECT=matched; output-sha256=1d2188baf535dad82c0054667f481fb5cdac5d2a081286d6f008fa435d607e9e; output-bytes=6903; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G5: Both requested controls were visually verified in the Discover UI.
  EVIDENCE: The prior browser pass rendered the DAYC 24h sparkline and all 8 loaded pre-IPO cards with a Trade on PreStocks action; the card detail interaction remained available from the separate button area.
