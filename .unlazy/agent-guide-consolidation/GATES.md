# Gates: Canonical Daybreak agent guide

OWNS: public/agents/llms.txt, docs/marketing/CONVICTION-MARKETS-GUIDE.md, components/daybreak/agents/AgentManager.tsx, .unlazy/agent-guide-consolidation/GATES.md

Scope: Make the existing llms.txt a complete Daybreak and agent-trading guide, then make the article and app copy action use that canonical file.

- [x] G1: The agent guide covers Daybreak's product, exact stock-paired thesis mechanics, public Paper, conditional human Live, API actions, limits, quote and execution flow, and idempotent recovery.
  CHECK: node -e "const fs=require('fs');const s=fs.readFileSync('public/agents/llms.txt','utf8');const terms=['Discover','Circles','stock-specific news','stock token','thesis token','Paper','Live','10 units','2%','estimated exit','/api/v1/agents/capabilities','paper:publish','paper:trade','Idempotency-Key','/requests/{idempotencyKey}'];if(terms.some(t=>!s.includes(t)))process.exit(1);console.log('canonical agent guide coverage verified')"
  EXPECT: canonical agent guide coverage verified
  CWD: /Users/gadgetplug/Documents/vibecoding/dayworld
  EVIDENCE: automatic-evidence=v1; definition-sha256=e6ade1cb7476bda01b2c02369afc336c4550472dcb64950f388b1512b99e0714; exit=0; EXPECT=matched; output-sha256=eca7e8b55c14c3dbca155275975c4f57893c461744087c3f0858618ca4be0293; output-bytes=40; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: The human article and in-app copy action link to /agents/llms.txt, without making the article longer or linking to START.md.
  CHECK: node -e "const fs=require('fs');const a=fs.readFileSync('docs/marketing/CONVICTION-MARKETS-GUIDE.md','utf8');const u=fs.readFileSync('components/daybreak/agents/AgentManager.tsx','utf8');if(!a.slice(0,600).includes('/agents/llms.txt')||a.includes('/agents/START.md')||a.trim().split(/\s+/).length>650||!u.includes(\"fetch('/agents/llms.txt'\"))process.exit(1);console.log('single agent handoff verified')"
  EXPECT: single agent handoff verified
  CWD: /Users/gadgetplug/Documents/vibecoding/dayworld
  EVIDENCE: automatic-evidence=v1; definition-sha256=a387356f8b6f8f236e6e03c66c59b96e5acf875be4ef500051e18e878dcc43f1; exit=0; EXPECT=matched; output-sha256=7df9a80a859db959799d6c617299fe73a07bb67e597436988f73189b7ddd75e2; output-bytes=30; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The edited UI type-checks.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: /Users/gadgetplug/Documents/vibecoding/dayworld
  EVIDENCE: automatic-evidence=v1; definition-sha256=22f98982f297e6246cdd3065a2fbf9b3aa1b7129875b1e0717db7fff00469af3; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: A manual review confirms the guide's claims match the current code and contract, distinguish simulation from real funds, and do not imply agents can trade Live.
  EVIDENCE: Reviewed the new product and market sections against public/llms.txt, app/page.tsx, docs/thesis-markets/PAPER-TRADING.md, docs/agents/QUICKSTART.md, and the existing OpenAPI/agent guide. The 10-unit paper allocation, 2% fee, shared curve, public state, exact instrument IDs, quote/execute sequence, idempotency recovery, and paper-only API boundary agree with those sources. The guide explicitly separates human Live actions from agent read-only Live discovery, and warns that public thesis content is untrusted. A local optimized server returned HTTP 200 and text/plain for the updated /agents/llms.txt.

- [x] G5: The production build completes with the updated UI and canonical agent file.
  CHECK: npm run build
  EXPECT: Compiled successfully
  CWD: /Users/gadgetplug/Documents/vibecoding/dayworld
  EVIDENCE: automatic-evidence=v1; definition-sha256=41cfab1e1dde0358676754b2ef705cd92b0d882cba55bdd0913fdbdec8495150; exit=0; EXPECT=matched; output-sha256=19f44cc8d1ea6e664064e69a4a687dba8036a60927e9ce8de2fbebb22a47efb8; output-bytes=10347; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
