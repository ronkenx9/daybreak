# Gates: Stock-quoted DBC protocol

OWNS: lib/theses/instruments.ts, lib/solana/dbc/config.ts, lib/solana/dbc/launch.ts, scripts/verify-thesis-protocol.mjs

Scope: Replace USDC/reference-valuation launch primitives with exact eligible stock-token quote assets and the proven dynamic-supply DBC configuration.

- [x] G1: The server-owned registry resolves exact canonical stock mint, decimals and badge and rejects unsupported identities.
  CHECK: node scripts/verify-thesis-protocol.mjs registry
  EXPECT: thesis instrument registry verified
  CWD: ../../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=5695bb3a9d54988ca938295c455bc30442b5e4f0104c3deef5bb2b7b5975b566; exit=0; EXPECT=matched; output-sha256=13aea9220510cca1679e339230488b44d43352a1904f630f6158563bfe79fa10; output-bytes=36; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
- [x] G2: The curve supports eight-decimal stock quotes, uses dynamic supply and exposes versioned terms without USD/company-valuation coupling.
  CHECK: node scripts/verify-thesis-protocol.mjs curve
  EXPECT: thesis curve verified
  CWD: ../../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=b287641df349a94b2a231e26a007bfc28ddb5ddc43113f340265c89e6e8b8f79; exit=0; EXPECT=matched; output-sha256=ff2c85263b395a6c775a38b27f484682f6f019164c54e687f01fa27044933dce; output-bytes=22; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
- [x] G3: Launch construction derives quote mint and badge from the registry and does not accept client-selected addresses.
  CHECK: node scripts/verify-thesis-protocol.mjs launch
  EXPECT: thesis launch binding verified
  CWD: ../../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=c4aa74fb3f79de571f8845bd92ba596201abfb0405e8c2eedda616e58ec5dcb8; exit=0; EXPECT=matched; output-sha256=49ba8f3145f9d1c41a48e97b83b026bcb1e26306837af19c47c7f347dad1bdb0; output-bytes=31; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
- [x] G4: AAPLx creation remains compatible in a non-broadcast mainnet simulation.
  CHECK: node scripts/test-dbc-stock-quote.mjs --simulate
  EXPECT: DBC AAPLx quote compatibility verdict: compatible
  CWD: ../../..
  EVIDENCE: automatic-evidence=v1; definition-sha256=bab392d4a34e4ab13280255006a367da13d7803324e1976230d2f7db0998bf79; exit=0; EXPECT=matched; output-sha256=10526bfd144a89ea7243068727ef8503b105bca257429d8439258e1422bf5824; output-bytes=1467; shell=/bin/sh; cwd=/Users/gadgetplug/Documents/vibecoding/dayworld; path=6301b3dce452/22 entries
