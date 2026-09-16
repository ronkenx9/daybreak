# GATES — Solana swap quote via Jupiter (foundation plan S4, quote stage)

Scope: read-only USDC→xStock quotes on Solana via Jupiter, shown in the stock workspace.
Execution (build + user-sign + send) is a separate, gated step. No funds move here.

## G1 — real Jupiter route
- CHECK: `GET /api/solana/swap-quote?ticker=<T>&usdc=<n>` (Jupiter Swap API quote).
- EVIDENCE (2026-09-16/17): USDC→AAPLx 10 USDC → 0.0300 AAPLx; USDC→NVDAx 25 USDC → 0.11613229
  NVDAx, min 0.11497097, price impact 0.0004%, 1 hop, ExactIn. Amounts track the equity price.

## G2 — correct mints and decimals
- CHECK: inputMint = USDC (EPjFW…TDt1v, 6dp), outputMint = the S1-verified xStock mint, output
  scaled by 8 decimals. Solana mints are used verbatim (case-sensitive).
- EXPECT: outAmount/otherAmountThreshold decoded to shares with 8 decimals; min received reflects
  slippageBps. ✓

## G3 — honesty
- CHECK: the widget states it is a live quote, execution is signed in the user's own Solana wallet
  as a separate explicit step (Daybreak never moves funds), eligible jurisdictions only, and a
  quote is not a reserved price.
- EXPECT: no auto-execution; no fabricated route. ✓

## G4 — scoping
- CHECK: only rendered for tickers with a Solana xStock (`isXstockTicker`, client-safe list).
- EXPECT: hidden for Base-only tickers. ✓

## Type/build
- CHECK: `npx tsc --noEmit` → exit 0. ✓

## Remaining manual gate (needs a funded wallet — NOT authorized by this plan)
- [ ] Execution: fetch Jupiter `/swap` for the user's Solana pubkey, decode/simulate, sign via
  Privy (`signSolanaTransaction`), send, and reconcile the finalized balance/fees. Requires a
  funded Solana wallet and explicit authorization; never blind-resubmit an expired tx.
