# Gates: Conviction article square graphics

OWNS: exports/conviction-article-cover-1x1.png, exports/conviction-article-pair-agents-1x1.png, .unlazy/conviction-graphics/GATES.md

Scope: Deliver two distinct, coordinated 1:1 article graphics based on the owner's Daybreak landscape image.

- [x] G1: Both final PNGs exist in the project, are square, and are nonempty.
  CHECK: node -e "const fs=require('fs');for(const p of ['exports/conviction-article-cover-1x1.png','exports/conviction-article-pair-agents-1x1.png']){const b=fs.readFileSync(p);if(b.length<100000||b.toString('hex',0,8)!=='89504e470d0a1a0a'||b.readUInt32BE(16)!==b.readUInt32BE(20))process.exit(1)}console.log('two square graphics verified')"
  EXPECT: two square graphics verified
  CWD: /Users/gadgetplug/Documents/vibecoding/dayworld
  EVIDENCE: automatic-evidence=v1; definition-sha256=da2f29abcef8fc303fd7397291b72bf66e4c582bb02675f9e85099840841a9fc; exit=0; EXPECT=matched; output-sha256=2ddb997d77d97310edb7fa8839479121fada7d75e0ba86506e5bfc4e604d3a1b; output-bytes=29; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Visual review confirms the supplied landscape palette/texture and Daybreak mark are present, the two graphics are distinct yet cohesive, and their exact text is legible.
  EVIDENCE: Inspected the original 1500×500 background and the two final 1254×1254 results. Both carry the deep blue sky, iridescent cloud ridge, green woven hills, and off-white Daybreak split-square. Cover text reads “TRADE THE THESIS”; the revised pairing graphic reads “AAPLx”, “THESIS”, “ONE PUBLIC PAPER MARKET”, and “PEOPLE + AGENTS”. The layout and type remain legible at square social-preview scale, with no extra symbols or incorrect labels.
