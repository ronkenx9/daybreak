# Gates: full-bleed stock cards with charts

OWNS: components/daybreak/StockCards.tsx, components/daybreak/PreStocksDiscovery.tsx, components/daybreak/Sparkline.tsx, app/api/memechart/route.ts, app/daybreak.css, docs/card-full-bleed/GATES.md

Scope: Make stock and pre-IPO card artwork fill its media area and add a real 24-hour chart below each card title.

- [x] G1: Stock and pre-IPO cards both render a 24-hour Sparkline below the card title using their canonical token identifiers.
  CHECK: node -e "const fs=require('node:fs');const s=fs.readFileSync('components/daybreak/StockCards.tsx','utf8');const p=fs.readFileSync('components/daybreak/PreStocksDiscovery.tsx','utf8');if(!s.includes('token={token.token}')||!p.includes('token={p.mint}')||!p.includes('network=\"solana\"'))process.exit(1);console.log('card chart wiring verification passed')"
  EXPECT: card chart wiring verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=b0ef830e8c760b09840fc06ea2b60d39faca856adf2e1da9e39c4ccbdea98ad2; exit=0; EXPECT=matched; output-sha256=a9e2d5c161c13c2dcec6907c01a4066274d87e99d328adeea39dcd9eddbd4f20; output-bytes=38; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: The shared chart endpoint preserves Base address behavior and accepts case-sensitive Solana mint addresses for PreStocks charts.
  CHECK: node -e "const fs=require('node:fs');const s=fs.readFileSync('app/api/memechart/route.ts','utf8');if(!s.includes(\"requestedNetwork !== 'base'\")||!s.includes(\"requestedNetwork !== 'solana'\")||!s.includes(\"network === 'base' ? value.toLowerCase() : value\")||!s.includes('const gt = (network: Network)')||!s.includes('const result = await cached('))process.exit(1);console.log('multi-network chart verification passed')"
  EXPECT: multi-network chart verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=4207913195692a4da40ada3d5e1a927062c06512157c359a5b172cddd41660ca; exit=0; EXPECT=matched; output-sha256=6d3b68f8f02509c0d9323bc4d885fcf76522ce23557918a1388d170113ebfd57; output-bytes=40; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: Card artwork uses the full media box, including stock logo wrappers and PreStocks images, with no small centered-logo override remaining.
  CHECK: node -e "const fs=require('node:fs');const c=fs.readFileSync('app/daybreak.css','utf8');if(!c.includes('.db-stock-card-art>.db-token{width:100%!important;height:100%!important')||!c.includes('.db-prestock-logo-lg{width:100%;height:100%;border-radius:0;object-fit:cover'))process.exit(1);console.log('full-bleed artwork verification passed')"
  EXPECT: full-bleed artwork verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=fd469a0ce45140139f41fdf9b3a24c189c66dd381055e180f018209fe6637199; exit=0; EXPECT=matched; output-sha256=59b430faf99f4b3d1189625af31126d37d690b81756bec39163236944743ac84; output-bytes=39; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The Daybreak acceptance audit remains green.
  CHECK: npm test
  EXPECT: acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e4cae9dfe2744e9e7883703f2050601b4208ea0541089c4a76e009905a9a4579; exit=0; EXPECT=matched; output-sha256=33d4bd8f605615349213e07a0e923bea6bfcb2f6f290d9ca545058220c3d8864; output-bytes=1938; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G5: The complete application remains type-safe and production-buildable.
  CHECK: npm run type-check && npm run build
  EXPECT: Compiled successfully
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=089ad4e936ed44b49d30d65e2b7303e4583bc80bf1c899bb9b838dcf572be1fb; exit=0; EXPECT=matched; output-sha256=1e0d995438b7c99ff32396a686a98752c953d75514f2af427798e7c68ec29ae5; output-bytes=6903; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G6: Desktop and mobile visual inspection show full-bleed artwork, readable overlaid controls, and visible charts on both stock and pre-IPO cards without clipping or layout overflow.
  EVIDENCE: Browser inspection at 877×837 and 390×844 showed the stock and PreStocks logo fields filling their media squares, overlaid price controls remaining legible, charts appearing below each title, and the two-column mobile grid remaining within the viewport. Live PreStocks cards populated measured red/green 24h trend lines after the data response completed.
