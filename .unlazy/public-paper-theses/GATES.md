# Gates: Public paper theses

OWNS: app/api/theses/[id]/quote/route.ts, app/api/theses/paper/route.ts, app/api/theses/paper/[id]/route.ts, app/api/theses/paper/[id]/trade/route.ts, app/daybreak.css, components/daybreak/theses/PaperTradingMode.tsx, components/daybreak/theses/PublicThesisPage.tsx, components/daybreak/theses/ThesisCard.tsx, components/daybreak/theses/ThesisDetail.tsx, components/daybreak/theses/ThesisHub.tsx, components/daybreak/theses/ThesisTradePanel.tsx, components/daybreak/theses/types.ts, lib/db/repo-theses.ts, lib/db/schema.ts, lib/theses/paper.ts, drizzle/0018_public_paper_theses.sql, drizzle/meta/_journal.json, scripts/audit-core.cjs, scripts/db-verify.mjs, scripts/verify-paper-mode.mjs, scripts/verify-public-paper-theses.mjs, docs/thesis-markets/PAPER-TRADING.md, .unlazy/public-paper-theses/GATES.md

Scope: Publish paper theses into the shared Conviction feed with one server-authoritative simulated curve, public trades, public positions and public P/L.

- [x] G1: Public paper thesis creation is authenticated, bounded, immediately published with one shared simulated market, and does not request a wallet.
  CHECK: npm test
  EXPECT: 43 acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=bf6f0ffcef8499b87f7e5b0c05369c63a1a14d85ca70e2b0a1c271c90758dc67; exit=0; EXPECT=matched; output-sha256=c588c6a6f9b142cfa12d6b528373ca5dbd5b5b6220e172421df8d938338f4005; output-bytes=2933; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Conviction discovery separates All, Paper and Live theses and routes public paper cards into a shared market with public activity and leaderboard.
  CHECK: node scripts/verify-public-paper-theses.mjs
  EXPECT: public paper thesis integration verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=3a22b5d7a49752ab8e2868c485ad086ee8d504acd783e3ec12a097342b5fe8e4; exit=0; EXPECT=matched; output-sha256=cb58d45cbfcff0327c34ada1cb729291ee7ce0538796659c6b7d8b265a72e41a; output-bytes=41; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The application remains type-safe.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The production application compiles with public paper discovery.
  CHECK: npm run build
  EXPECT: Generating static pages
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d813e15a0f156714ca07a24e96ccbede7f3949d554a5c0f517f628347f886c46; exit=0; EXPECT=matched; output-sha256=a1182a1950f444ca6ab14497f5451cbc7da151651b5d78c1446aa25523669e93; output-bytes=8478; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G5: The deployed database has the public paper market, balance, position and trade schema with RLS enabled.
  CHECK: npm run db:verify
  EXPECT: Database ready: 39 Daybreak tables with RLS enabled.
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=a39c49137f3882c6a2e8831d8d76f6c928e901a8868d97dc25fa3336175f61de; exit=0; EXPECT=matched; output-sha256=d942a8da786017d419c70fcb94ed1a2a42407627b0054de3a7a5fc766c3abdeb; output-bytes=143; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
