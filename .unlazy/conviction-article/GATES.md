# Gates: Conviction Markets guide article

OWNS: docs/marketing/CONVICTION-MARKETS-GUIDE.md, .unlazy/conviction-article/GATES.md

Scope: Produce a publish-ready practical guide to Conviction Markets for human and agent participants in the reference article's approachable roadmap structure.

- [x] G1: A substantial article with actionable human and agent paths exists in the marketing drafts.
  CHECK: node -e "const s=require('fs').readFileSync('docs/marketing/CONVICTION-MARKETS-GUIDE.md','utf8');if(s.trim().split(/\s+/).length<1200||!s.includes('for humans')||!s.includes('For agents'))process.exit(1);console.log('article structure verified')"
  EXPECT: article structure verified
  CWD: /Users/gadgetplug/Documents/vibecoding/dayworld
  EVIDENCE: automatic-evidence=v1; definition-sha256=262e416fea4cce83d32efb1799ce782efc208fdf494736dc86156f18ea4b2b6a; exit=0; EXPECT=matched; output-sha256=261bf304fca0388071578845dedb228cf9fe4793e4c8ae5577b4c5206e1d72bd; output-bytes=27; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Mechanics, limitations, eligibility, links and verified tags match the current app, API guide and primary sources.
  EVIDENCE: Checked ThesisHub, PaperTradingMode, ThesisComposer, ThesisTradePanel, docs/thesis-markets/PAPER-TRADING.md and public/agents/llms.txt against every participation step; confirmed paper-only agent boundary, 10-unit shared paper allocation, 2% fee, public activity/P&L, live wallet review and optional agent strategy. Canonical app, guide, OpenAPI and GitHub quickstart returned HTTP 200. xStocks eligibility comes from xstocks.com/partner; Meteora launch context from launch.meteora.ag. @valgui1, @xStocksFi, @MeteoraAG and @solana were checked against their own X pages or official project links; @Daybreakcircles is the app footer link.

- [x] G3: The writing follows the reference's teaching pattern (problem, plain-language model, staged steps, resources and practical tasks) without copying passages.
  EVIDENCE: Reviewed the complete 2,392-word draft against the pasted article's teaching pattern. The opening identifies common failure modes, defines the product in plain language, gives staged human and agent routes, and ends major steps with independent practice tasks and a linked resource list. No source passage was reused.
