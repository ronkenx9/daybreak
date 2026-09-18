# Gates: Thesis trading lifecycle

OWNS: lib/solana/dbc/trade.ts, app/api/theses/[id]/quote/**, app/api/theses/[id]/trade/**, scripts/verify-thesis-trading.mjs, lib/db/schema.ts, lib/db/repo-theses.ts, drizzle/0017_thesis_markets.sql

Scope: Build exact buy/sell quotes and wallet-signable transactions with phase, mint, slippage and intent verification.

- [x] G1: Buy and sell quotes use exact market mints and correctly labelled raw/display stock-token units.
  EVIDENCE: Exact stored mints are checked against registry/onchain state; Scaled UI Amount conversion uses the live mint in both directions.
- [x] G2: Built transactions bind owner, pool, direction, amount and minimum output and reject stale/migrated phases.
  EVIDENCE: Stored transaction message hash, signer, blockhash, expiry and minimum output are checked before broadcast.
- [x] G3: Transfer-hook requirements and post-graduation routing fail closed until verified for the exact instrument.
  EVIDENCE: Runtime rejects active unverified hooks, fees, paused mints and migrated DBC pools.
- [ ] G4: Deterministic trading verifier and TypeScript pass.
  CHECK: node scripts/verify-thesis-instruments.mjs && node scripts/verify-thesis-trading.mjs && npm run type-check
  EXPECT: thesis trading verified
  EVIDENCE: pending
