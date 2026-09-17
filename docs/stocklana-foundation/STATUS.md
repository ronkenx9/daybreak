# Stocklana / Solana foundation — end-to-end status

Updated 2026-09-17. Every "built" item below is committed and verified against a real source
(gates in this folder). Nothing here is fabricated; items that need credentials, funds, user
data or legal review are marked blocked with why — the plan's own discipline forbids faking them.

## Built and verified

| Step | What | Evidence |
|---|---|---|
| S1 | xStocks instrument registry (10 overlapping equities) | `lib/solana/xstocks-registry.ts` · on-chain: all Token-2022, decimals 8, scaledUiAmount · `S1-GATES.md` |
| S2 | Solana holdings reader + `/api/solana/holdings` | live mainnet read at real slot · `S2-GATES.md` |
| S2b | Solana xStocks on the Holdings page | dark render verified |
| Prices | Pyth adapter (verified feed IDs) + `/api/equity-prices` with Chainlink reference fallback; USD values on Solana holdings | AAPL $331.94, NVDA $214.13 (chainlink-ref) · `PRICES-GATES.md` |
| C1–C6 | Corporate actions (company event vs token treatment) + `/api/xstocks/corporate-actions` | AAPL dividends stepping multiplier 1.00266→1.00327 · `CORPORATE-ACTIONS-GATES.md` |
| L1–L4 | Instrument facts / compliance panel + `/api/xstocks/facts` | real underlying ISINs; no-voting-rights + issuer-controls stated · `COMPLIANCE-GATES.md` |
| S4 (quote) | Jupiter USDC→xStock quote + `/api/solana/swap-quote` | 25 USDC → 0.1161 NVDAx live · `S4-SWAP-GATES.md` |
| P3 | Market-hours labels (live/pre/post/last close) from Pyth free sessions | session logic verified · `MARKET-HOURS-GATES.md` |
| A8 | `/api/stats` unknown ≠ zero | null on read failure, em dash in UI |

## Blocked on an external input (build is ready; verification needs the input)

| Step | Blocked on | What flips it on |
|---|---|---|
| Live Pyth prices | Pyth Pro credentials (Hermes returns 401) | set `PYTH_API_KEY`; adapter already wired |
| S4 execution | a funded Solana wallet + explicit authorization (no funds authorized by the plan) | build Jupiter `/swap`, sign via Privy `signSolanaTransaction`, send, reconcile |
| Solana holder verification | non-rate-limited RPC (`getTokenLargestAccounts` blocked on free RPCs) | set `SOLANA_RPC_URL` (Helius/QuickNode) |
| PoR per-symbol number | recency-ordered PoR endpoint | cache a full PoR map or a per-symbol endpoint |

## Genuinely large, not fabricated (needs real user data / decisions)

- **A1–A7 personal analytics ledger** (cost basis, realized/unrealized P&L, time-weighted return,
  event attribution): a cash-flow-aware ledger over the user's real transaction history. The plan
  gates this heavily ("a deposit is not profit"; "exclude unknown-basis lots"). Building a fake
  P&L would violate the plan. Prerequisite: ingest real per-user buys/sells/transfers/fees with
  provenance. Portfolio **exposure** (current reference value by chain) is already visible via the
  Base + Solana holdings sections on one Holdings page.
- **L2/L5 versioned action policies + data-permission audit**, and **E1–E4 extensions** (cross-chain
  circle eligibility, in-app execution, launch intelligence, fee-funded rewards): each depends on a
  foundation gate above and on product/legal decisions, not just code.

## Honest bottom line
The Solana foundation is functionally end-to-end for the four questions the plan sets — a user
opens a supported stock and sees labeled prices, sourced company events with their token treatment,
the instrument's rights/controls, and their cross-chain holdings. The remaining work is not
un-started code so much as inputs the plan explicitly requires (a Pyth key, a funded wallet for
execution, real user transaction history for P&L) — provide those and the gated steps light up.
