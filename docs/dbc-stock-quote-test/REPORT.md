# Meteora DBC stock-token quote test

Date: 2026-09-18
Network: Solana mainnet-beta
Method: read-only account inspection plus signature-skipped transaction simulation

## Verdict

The canonical AAPLx token can be used as the actual quote asset of a Meteora Dynamic Bonding Curve pool. A simulated `createConfigAndPool` transaction using AAPLx as `quoteMint` completed successfully on mainnet-beta with no program error.

This validates the core Daybreak mechanic: a thesis token can be paired directly with its underlying stock token, for example `AAPLTH / AAPLx`. AAPLx was the representative non-broadcast pool-creation test. A later batch audit verified all ten canonical Daybreak xStocks for the shared quote-token eligibility rules described below.

## Evidence

- Stock token: AAPLx
- Canonical mint: `XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp`
- Token program: Token-2022
- Quote decimals: 8
- Meteora token badge: `8VeVZe3Zxfpax2qQUp7i68FCLspLYErm2FJChc5NDuVn`
- Simulation result: `err: null`
- Compute units consumed: `117714`
- Broadcast transactions: none
- Wallet signatures requested: none

The inspected mint exposes these Token-2022 extensions:

- MetadataPointer
- PermanentDelegate
- DefaultAccountState
- ScaledUiAmountConfig
- PausableConfig
- ConfidentialTransferMint
- TransferHook
- TokenMetadata

The successful simulation executed Token-2022 mint initialization and minting, authority setup, and Meteora DBC configuration and pool initialization.

## What the test proves

Meteora's deployed DBC program accepts AAPLx as the quote mint when its token-badge account is supplied. The pool configuration can collect trading fees in the stock token, so a thesis market can be economically tied to the stock token instead of using USDC as a loose proxy.

## What remains to test

This test did not broadcast the pool, so the created accounts do not persist. A separately simulated buy or sell cannot reference them afterward. Before production launch, Daybreak should run a controlled end-to-end deployment that creates a pool, swaps in both directions, claims fees, and exercises graduation to DAMM v2.

All ten canonical xStocks now have registry entries containing their exact mint, decimals, Token-2022 program and derived Meteora badge. The runtime still rechecks the selected mint before every market build and trade; a missing badge or changed extension state fails closed.

## Daybreak implementation result

Daybreak now uses this evidence in the Conviction product:

- `lib/theses/instruments.ts` maps every canonical xStock to its exact mainnet mint and badge.
- `lib/solana/dbc/launch.ts` derives the quote asset from that server registry and rechecks the live Token-2022 mint before building.
- `lib/solana/dbc/config.ts` supports eight-decimal stock quotes and uses the proven dynamic-supply configuration.
- `lib/solana/dbc/trade.ts` binds buys and sells to the stored pool/mints and converts visible quantities through the live Scaled UI Amount multiplier.
- `scripts/verify-thesis-instruments.mjs` reproduces the batch audit for AAPLx, AMZNx, GOOGLx, NVDAx, TSLAx, METAx, MSFTx, COINx, INTCx and MSTRx.

The remaining protocol boundary is graduation: the DBC route deliberately fails closed after migration until a graduated-pool adapter receives its own exact-instrument verification.

## Reproduction

```bash
node scripts/test-dbc-stock-quote.mjs --inspect
node scripts/test-dbc-stock-quote.mjs --simulate
```

The script defaults to `SOLANA_RPC_URL` when configured and otherwise uses the public Solana mainnet endpoint. It constructs and simulates a transaction only; it contains no send or confirm call.
