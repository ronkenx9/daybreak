# Gates: Circle-scoped news and discussion

OWNS: app/api/circles/news/route.ts, app/api/news/comments/route.ts, components/daybreak/CircleNews.tsx, components/daybreak/CirclesHub.tsx, components/daybreak/NewsDiscussion.tsx, lib/db/repo.ts, lib/news/url.ts, scripts/verify-circle-news-scope.mjs, docs/circle-news-scope/GATES.md

Scope: Serve news from each circle's configured holdings and keep article discussions scoped to that circle.

- [x] G1: Circle news is resolved server-side from stored circle tickers, balanced across holdings, cached, and protected by circle eligibility.
  CHECK: node scripts/verify-circle-news-scope.mjs
  EXPECT: circle news scope verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d1fbefa188c4b8d41fecb4c49f0d6eafc103771d827647c57f0d529a8b4974f8; exit=0; EXPECT=matched; output-sha256=c1590aa4dad5d93525838357626db332ade9114d87c95cbe45133024edc841e5; output-bytes=27; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Circle discussions use circle + ticker + canonical URL identity and require active membership to post.
  CHECK: node scripts/verify-circle-news-scope.mjs --discussion
  EXPECT: circle discussion scope verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=cd59fa1ddf8fe19ca1595e773ce9f92830a56b5b68c6da868c66c67db531af42; exit=0; EXPECT=matched; output-sha256=0841d9cde46fec7fa29bad0963dc8d6c3c43a583d21472e7e68d7c76254bfd45; output-bytes=33; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The scoped news integration remains type-safe.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  EVIDENCE: automatic-evidence=v1; definition-sha256=e1bbd01befe5acfb860b82af01d607e828fa0400877da3c00b5ac1118dbee533; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld/docs/circle-news-scope; path=6301b3dce452/22 entries

- [x] G4: Existing application acceptance checks remain green.
  CHECK: npm test
  EXPECT: 31 acceptance groups passed
  EVIDENCE: automatic-evidence=v1; definition-sha256=14db46a761d7d1ef0fa5ed3617c32ebfb00d8e574201cd520034c90d439742e5; exit=0; EXPECT=matched; output-sha256=33d4bd8f605615349213e07a0e923bea6bfcb2f6f290d9ca545058220c3d8864; output-bytes=1938; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld/docs/circle-news-scope; path=6301b3dce452/22 entries
