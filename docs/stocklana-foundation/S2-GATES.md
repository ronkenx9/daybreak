# GATES — Solana xStocks holdings reader (foundation plan S2)

Scope: read a Solana wallet's xStocks (Token-2022) balances with Scaled-UI-Amount-aware
quantities. Read-only; no funds. Artifacts: `lib/solana/{client,holdings}.ts`,
`app/api/solana/holdings/route.ts`.

## G1 — reads under Token-2022, matched to the verified registry
- CHECK: `readSolanaXstockHoldings` calls `getParsedTokenAccountsByOwner(owner, {programId:
  TOKEN_2022_PROGRAM_ID})` and keeps only mints in `XSTOCK_BY_MINT`.
- EXPECT: classic-SPL accounts and non-xStock mints are ignored; a mint proves identity, not a
  ticker. ✓ (code, keyed on the S1-verified registry)

## G2 — live read works end-to-end
- CHECK: `GET /api/solana/holdings?address=<valid>` against live Solana mainnet.
- EVIDENCE (2026-09-16, dev server):
  - `address=notvalid` → HTTP 400 (input validation, no RPC).
  - `address=EPjFWdd5…TDt1v` (valid base58) → 200, real `slot: 447603108`, `chain:"solana"`,
    `status:"complete"`, `holdings: []` (that address holds no xStocks). Reader → RPC →
    response path confirmed against mainnet.

## G3 — Solana correctness discipline
- CHECK: base58 validation (32–44, no 0/O/I/l); addresses never lowercased; multiple token
  accounts for one mint aggregated; `rawAmount` (unscaled) and `quantity` (RPC uiAmountString,
  Scaled-UI-Amount applied) both returned with the basis documented. ✓ (code)

## Type/build
- CHECK: `npx tsc --noEmit` → exit 0, 0 errors. ✓

## Remaining manual gate (blocked by free-RPC limits this session)
- [ ] Verify against a **real xStock holder**: the displayed `quantity` equals the RPC's
  Scaled-UI-Amount, and after a split the multiplier is applied exactly once (not raw/1e8).
  `getTokenLargestAccounts` (to find a holder) is blocked on the public endpoints; run this with a
  provider RPC set in `SOLANA_RPC_URL`.

## Not yet built (next)
- Surface Solana xStock holdings in the Holdings UI alongside Base (uses `account.solanaWallet`).
- Pyth price adapter; xStocks corporate-actions ingestion.
