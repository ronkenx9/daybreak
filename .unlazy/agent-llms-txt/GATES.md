# Gates: Daybreak agent llms.txt

OWNS: public/llms.txt, public/agents/llms.txt, public/agents/openapi.yaml, scripts/verify-agent-llms.cjs

Scope: Publish a complete machine-readable guide for discovering and safely using Daybreak's agent participation API from the canonical site.

- [x] G1: The detailed agent llms.txt documents every public and authenticated agent endpoint, authentication, scopes, policy limits, paper publication and trading, idempotency recovery, errors, SDK usage, public visibility, and the disabled live-execution boundary.
  CHECK: node scripts/verify-agent-llms.cjs
  EXPECT: agent llms verification passed
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=f011521bb88cf7d44874401933cca10780ae4f96242a46a2b0cafad9a8d61c9c; exit=0; EXPECT=matched; output-sha256=c8f8bd4e3773110a31d0be141682f581476d806bacd60f22e57824a9897791d4; output-bytes=60; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G2: The root llms.txt remains the canonical product discovery file and links agents directly to the detailed agent guide, site-hosted OpenAPI contract, capabilities endpoint, and repository quickstart without removing the existing x402 information.
  CHECK: node scripts/verify-agent-llms.cjs
  EXPECT: root llms discovery verified
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=619ec37ef8235cd6804ca17fe59ec2e7f96b19fcdfec61b8a44a78bf10f20df6; exit=0; EXPECT=matched; output-sha256=c8f8bd4e3773110a31d0be141682f581476d806bacd60f22e57824a9897791d4; output-bytes=60; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G3: The site remains TypeScript-clean after the public documentation change.
  CHECK: npm run type-check
  EXPECT: tsc --noEmit
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=e0ba537c828bceb7b090e2a3a98fb848e668fb70276d331a9ed93d17a5abb71f; exit=0; EXPECT=matched; output-sha256=f47e3f58b8b33dff28455bfa9a5dbcc0edaf3205f396822c2262b6bb3a665788; output-bytes=45; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries

- [x] G4: The production site build includes the new static agent discovery document.
  CHECK: npm run build
  EXPECT: Compiled successfully
  CWD: ../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=17992646590e52096726758d5dc47d9ebe277a0e8a47d09114765944f5bfa97e; exit=0; EXPECT=matched; output-sha256=4b00b069ac935f34d670366775485686dd042f9d8dfadf6594f1751caf42aaec; output-bytes=10347; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
