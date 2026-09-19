# Gates: agent-driven Flash stock orders

OWNS: lib/agents/**, lib/flash/**, lib/db/repo-agents.ts, lib/db/schema.ts, drizzle/**, app/api/v1/agents/**, app/api/me/agents/**, components/daybreak/agents/**, docs/agents/**, public/agents/**, docs/flash-agent/**, scripts/verify-flash-agent.mjs

Scope: An owner may explicitly enable one agent for bounded Flash limit orders from an owner-selected Solana wallet. The agent can request a quote, sign and broadcast setup with its wallet, submit its own signed order, and inspect durable request status. No server-side wallet custody or automatic live trade during tests.

- [x] G1: Live agent Flash requires explicit owner wallet binding, a separate scoped key, exact allowed stock instrument, order cap, and atomic daily reservation before submit.
  CHECK: node --conditions=react-server --import tsx scripts/verify-flash-agent.mjs
  EXPECT: flash agent verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=5cc15a619dd5aa5491bf9ceaadce8338a16c52d8e9e45dbea5f2464480cdbd95; exit=0; EXPECT=matched; output-sha256=08d337de50a7d734f59c40a958f5cb12f3046d4b8cf50aa2b009601023d7f308; output-bytes=32; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: Quote review binds actor, wallet, thesis, mint, price, amount, setup hash, and policy version; submit verifies wallet signature and idempotency without repeating ambiguous orders.
  CHECK: node --conditions=react-server --import tsx scripts/verify-flash-agent.mjs
  EXPECT: flash agent verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=5cc15a619dd5aa5491bf9ceaadce8338a16c52d8e9e45dbea5f2464480cdbd95; exit=0; EXPECT=matched; output-sha256=08d337de50a7d734f59c40a958f5cb12f3046d4b8cf50aa2b009601023d7f308; output-bytes=32; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: TypeScript checks the agent API, owner controls, SDK, and schema.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The agent guide, capabilities, and OpenAPI distinguish paper from live Flash and explain wallet and funds requirements.
  CHECK: node --conditions=react-server --import tsx scripts/verify-flash-agent.mjs
  EXPECT: flash agent verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=5cc15a619dd5aa5491bf9ceaadce8338a16c52d8e9e45dbea5f2464480cdbd95; exit=0; EXPECT=matched; output-sha256=08d337de50a7d734f59c40a958f5cb12f3046d4b8cf50aa2b009601023d7f308; output-bytes=32; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G5: Existing product acceptance tests still pass.
  CHECK: npm test
  EXPECT: 43 acceptance groups passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=bf6f0ffcef8499b87f7e5b0c05369c63a1a14d85ca70e2b0a1c271c90758dc67; exit=0; EXPECT=matched; output-sha256=c588c6a6f9b142cfa12d6b528373ca5dbd5b5b6220e172421df8d938338f4005; output-bytes=2933; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G6: The production build compiles all new routes in an isolated output directory.
  CHECK: NEXT_DIST_DIR=.next-flash-agent npm run build
  EXPECT: Compiled successfully
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=d2569fd29eb4586a9c13259d2492c0f0b99f5827d49bc05ecfbaee89d4f69447; exit=0; EXPECT=matched; output-sha256=e8bff079a7e09a9b777c09cd646cc3854054f8e4c93eefc01ac912bc42ded92a; output-bytes=10923; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G7: Isolated PostgreSQL tests prove key rotation, policy revocation, idempotent reservation, and concurrent daily USDC caps.
  CHECK: npm run test:agent-api
  EXPECT: agent API database integration passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=fbcc543f5fdacad88d4f55b2914ec8e0da0397478daeeef512d89ef291a441e0; exit=0; EXPECT=matched; output-sha256=5667f48ae0f377b9fc3751b775a1345d9530ec203c44bac631995533e419b992; output-bytes=426; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
