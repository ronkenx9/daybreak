# GATES — Equity prices (Pyth adapter + reference fallback) (foundation plan P2/P4)

Scope: USD reference prices for the tokenized equities, shown against Solana xStock holdings.
Read-only; prices are labeled reference, not executable quotes.

## G1 — Pyth feed IDs from the real catalog
- CHECK: resolve `Equity.US.<T>/USD` feed IDs from `hermes.pyth.network/v2/price_feeds`.
- EVIDENCE (2026-09-16): all 10 resolved (AAPL 49f6b6…, NVDA b10738…, etc.), stored in
  `PYTH_EQUITY_FEEDS`.

## G2 — Pyth gating is honest
- CHECK: the Hermes price endpoint returns **401 unauthorized** without credentials (verified
  2026-09-16). The adapter is gated on `PYTH_API_KEY`; with no key it returns `{}` and the caller
  falls back — it never fabricates a Pyth price.
- EXPECT: `/api/equity-prices` reports `pyth: false` until a key is set. ✓

## G3 — working reference today (Chainlink, same underlying)
- CHECK: `GET /api/equity-prices?tickers=AAPL,NVDA,TSLA`.
- EVIDENCE (2026-09-16, dev server): real values — AAPL $331.94, NVDA $214.13, TSLA $358.37,
  `source: "chainlink-ref"`, not stale. These are the Base Chainlink feeds for the same underlying
  equity, labeled as a reference (not a Solana DEX quote).

## G4 — labeled, not overclaimed
- CHECK: the UI shows a "Reference value" subtotal and per-row `reference`/`live` freshness label;
  a null price shows the share count, not a fake dollar value.
- EXPECT: no price is presented as an executable Solana quote; stale/closed-market prices are
  labeled. ✓ (verified render)

## Type/build
- CHECK: `npx tsc --noEmit` → exit 0. ✓

## Follow-ups
- [ ] Set `PYTH_API_KEY` (Pyth Pro) to flip the source to Pyth; then confirm session/market-hours
  staleness against Pyth publish_time.
- [ ] Price the Base holdings and the Solana holdings from one shared equity-price surface.
