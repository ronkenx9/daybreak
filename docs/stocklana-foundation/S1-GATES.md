# GATES — Solana xStocks instrument qualification (foundation plan S1 / F0)

Scope: qualify the exact Solana xStocks instruments from real sources before any
holdings/price/swap work. Read-only; no funds, no writes.
Artifact: `lib/solana/xstocks-registry.ts` (10 instruments overlapping the Base set).

## G1 — instruments come from the official xStocks catalog
- CHECK: `GET https://api.xstocks.fi/api/v2/public/assets` (paginated) for AAPL, AMZN, GOOGL,
  NVDA, TSLA, META, MSFT, COIN, INTC, MSTR.
- EXPECT: each returns an xStock symbol, ISIN and a Solana deployment mint.
- EVIDENCE (2026-09-16, live API): all 10 found with Solana mints and ISINs. e.g.
  AAPL → AAPLx, ISIN CH1436219187, mint `XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp`.

## G2 — mints validated on Solana mainnet (not trusted from metadata)
- CHECK: Solana `getAccountInfo(mint, jsonParsed)` for every mint.
- EXPECT (verified 2026-09-16, api.mainnet-beta.solana.com):
  - owner program = **Token-2022** `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` for ALL 10.
    (The xStocks API field `solanaTokenProgram: "TokenProgram"` is misleading — the chain says
    Token-2022. Corrects the plan's assumption; identity/facts come from the chain.)
  - decimals = **8** for all.
  - extensions include **`scaledUiAmountConfig`** (Scaled UI Amount) on all — plus
    permanentDelegate, pausableConfig, transferHook, confidentialTransferMint,
    defaultAccountState, metadataPointer, tokenMetadata.

## G3 — identity discipline
- CHECK: registry keys on `mint` (canonical) and `ticker`; `xstockByMint` does not lowercase
  (Solana addresses are case-sensitive). No StonkFun alias is treated as canonical.
- EXPECT: a ticker never proves identity; the mint does. ✓ (code)

## Type/build
- CHECK: `npx tsc --noEmit` → exit 0, 0 errors. ✓

## Load-bearing consequences for the next steps (recorded now)
- Holdings must use the **Token-2022** program and enumerate token accounts under it (not classic
  SPL), and apply the **Scaled UI Amount** multiplier exactly once (time-aware) — never EVM
  `balanceOf`/lowercasing semantics.
- Prices: state which quantity basis (raw vs scaled) a price multiplies.

## Not yet built (next per the plan)
- S2 holdings reader (`lib/solana/{client,holdings,amounts}.ts`) with scaled-UI-amount handling.
- Pyth price adapter; corporate-actions ingestion (xStocks `/public/corporate-actions/*`).
