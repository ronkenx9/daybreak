# Gates: Flash stock orders from conviction theses

OWNS: lib/flash/**, app/api/theses/[id]/flash/**, components/daybreak/AccountProvider.tsx, components/daybreak/theses/**, app/daybreak.css, scripts/verify-flash-integration.mjs, docs/flash-integration/**, README.md

Scope: A signed-in Daybreak user can review and submit a wallet-approved Flash limit order for the exact stock token attached to a live thesis, with safe setup and clear separation from backing the thesis token.

- [x] G1: The quote and submit routes bind the exact canonical stock mint, Solana USDC, owner wallet, limit terms, and Flash quote in a tamper-evident review; no arbitrary asset or wallet can be submitted.
  CHECK: node --conditions=react-server --import tsx scripts/verify-flash-integration.mjs
  EXPECT: flash integration verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=3f4fb5dab2e1ff6e17aedd18fd94358084b25df53aef2ef23c569dd1c76cfe26; exit=0; EXPECT=matched; output-sha256=ca7546afe696fa0c1e52eb6f085d96490c77e90e17fc54ac1a5ff5ffd93a0468; output-bytes=38; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Daybreak type checks with the new wallet signing and Flash order UI.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: Production build compiles the Flash routes and thesis detail.
  CHECK: npm run build
  EXPECT: Compiled successfully
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=17992646590e52096726758d5dc47d9ebe277a0e8a47d09114765944f5bfa97e; exit=0; EXPECT=matched; output-sha256=5bbc37d858ea58a2df1e98b4dc3d01159b2292605b2a98f37e17d355302aa8ce; output-bytes=10635; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The README documents setup, supported scope, exact file pointers, and the live-order boundary.
  CHECK: node --conditions=react-server --import tsx scripts/verify-flash-integration.mjs
  EXPECT: flash integration verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=3f4fb5dab2e1ff6e17aedd18fd94358084b25df53aef2ef23c569dd1c76cfe26; exit=0; EXPECT=matched; output-sha256=ca7546afe696fa0c1e52eb6f085d96490c77e90e17fc54ac1a5ff5ffd93a0468; output-bytes=38; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G5: Without a Daybreak integrator API key, Flash quote, order, and order-list requests fail before network access, and wallet setup cannot be broadcast.
  CHECK: node --conditions=react-server --import tsx scripts/verify-flash-integration.mjs
  EXPECT: flash integration verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=3f4fb5dab2e1ff6e17aedd18fd94358084b25df53aef2ef23c569dd1c76cfe26; exit=0; EXPECT=matched; output-sha256=ca7546afe696fa0c1e52eb6f085d96490c77e90e17fc54ac1a5ff5ffd93a0468; output-bytes=38; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
