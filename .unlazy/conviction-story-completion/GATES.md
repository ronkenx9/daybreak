# Gates: Complete Conviction feature story

OWNS: docs/marketing/CONVICTION-MARKETS-GUIDE.md, public/agents/llms.txt, .unlazy/conviction-story-completion/GATES.md

Scope: Add the public agent unlock and explain the actual Meteora DBC and PreStocks integration without making the human article bulky or overstating current support.

- [x] G1: The human article covers public paper agents, Meteora's stock-token-quoted Live curve, and PreStocks discovery while staying short.
  CHECK: node -e "const fs=require('fs');const s=fs.readFileSync('docs/marketing/CONVICTION-MARKETS-GUIDE.md','utf8');if(s.trim().split(/\s+/).length>650||!s.includes('agent')||!s.includes('Meteora')||!s.includes('PreStocks')||!s.includes('quote-token support')||!s.includes('/agents/llms.txt'))process.exit(1);console.log('complete short article verified')"
  EXPECT: complete short article verified
  CWD: /Users/gadgetplug/Documents/vibecoding/dayworld
  EVIDENCE: automatic-evidence=v1; definition-sha256=ab52b1fa3640069f441f7843018fbc98b559a75e2935d23614d002d995237dc8; exit=0; EXPECT=matched; output-sha256=581b6d795049a52facacd3ff530860a88780b4baf07664448e97fb8be98d74cb; output-bytes=32; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: The full agent guide explains Meteora DBC and PreStocks integration with correct Paper, Live, and eligibility boundaries.
  CHECK: node -e "const s=require('fs').readFileSync('public/agents/llms.txt','utf8');for(const t of ['Meteora','DBC','PreStocks','quote token','verification pending','paper-only','/api/v1/agents/capabilities'])if(!s.includes(t))process.exit(1);console.log('agent integration context verified')"
  EXPECT: agent integration context verified
  CWD: /Users/gadgetplug/Documents/vibecoding/dayworld
  EVIDENCE: automatic-evidence=v1; definition-sha256=0ffc9091ac244149227ae025970e8495a3699d3bae075333ef3bca071d288858; exit=0; EXPECT=matched; output-sha256=f266214171e0473c16ff7e833ea41700990092bf0647469b7e227266444abc25; output-bytes=35; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: Manual review confirms the article and guide match the current product and official protocol/issuer sources, with no claim that PreStocks can quote thesis markets or agents can trade Live.
  EVIDENCE: Compared article and guide with AgentManager, agent OpenAPI/quickstart, public paper-market docs, lib/theses/instruments.ts, the Meteora AAPLx simulation report, the retired /api/solana/dbc/conviction route, PreStocksDiscovery, and the PreStocks provider. The official Meteora DBC overview confirms its curve/pool model; PreStocks' product page confirms token price, mark, implied valuation, and premium fields. Copy says agents publish/trade only in public Paper; xStocks quote eligible Live thesis markets; PreStocks discovery/trade link is separate and direct DBC quote-token support is pending. The article is 544 words.
