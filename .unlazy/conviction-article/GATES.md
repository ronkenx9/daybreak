# Gates: Conviction launch explainer

OWNS: docs/marketing/CONVICTION-MARKETS-GUIDE.md, public/agents/START.md, components/daybreak/agents/AgentManager.tsx, .unlazy/conviction-article/GATES.md

Scope: Replace the bulky human guide with a short feature introduction and give agents a separate handoff document that the app can copy.

- [x] G1: The human article is short, begins with the recent stock-token conversation, explains a stock-paired thesis with one example, and links the agent handoff before the body.
  CHECK: node -e "const fs=require('fs');const s=fs.readFileSync('docs/marketing/CONVICTION-MARKETS-GUIDE.md','utf8');const w=s.trim().split(/\s+/).length;if(w>650||!s.slice(0,600).includes('/agents/START.md')||!s.includes('Paper')||!s.includes('Live')||!s.includes('AAPLx'))process.exit(1);console.log('short explainer verified',w)"
  EXPECT: short explainer verified
  CWD: /Users/gadgetplug/Documents/vibecoding/dayworld
  EVIDENCE: automatic-evidence=v1; definition-sha256=3777b411b703d7912d3332e92fdef420836c4ad890b35705dd29e0deab246969; exit=0; EXPECT=matched; output-sha256=1c4aac520f702371b006128e109948974161fff5e7208b958541bd231f602864; output-bytes=29; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: The agent handoff and in-app copy action use one public Markdown file, and it points to runtime capabilities and the full protocol guide.
  CHECK: node -e "const fs=require('fs');const a=fs.readFileSync('public/agents/START.md','utf8');const u=fs.readFileSync('components/daybreak/agents/AgentManager.tsx','utf8');if(!a.includes('paper-only')||!a.includes('/api/v1/agents/capabilities')||!a.includes('/agents/llms.txt')||!a.includes('Idempotency-Key')||!u.includes(\"fetch('/agents/START.md'\"))process.exit(1);console.log('agent handoff verified')"
  EXPECT: agent handoff verified
  CWD: /Users/gadgetplug/Documents/vibecoding/dayworld
  EVIDENCE: automatic-evidence=v1; definition-sha256=9370b5295dd33289842c06b9b9d5e5cf683914834be842802859cab08a76e954; exit=0; EXPECT=matched; output-sha256=d4afbf43754db6ad878e5f88a023cf700d6c7baf91b92f8690e5b400a96b5ab7; output-bytes=23; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The article reads as a feature announcement for a general audience, not as API documentation, and does not promise automatic gains or live agent trading.
  EVIDENCE: Read the complete 372-word article after the rewrite. It opens with meme coins, meme stocks, and the recent stock-token conversation; explains Conviction Markets through one AAPLx example; gives a direct Paper call to action; and confines agent details to a one-line handoff link. It says positions can rise or fall, distinguishes Paper from conditional Live, and makes no live-agent claim. The separate Markdown file explicitly says the agent API is paper-only.
