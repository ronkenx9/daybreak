# GATES — Corporate actions (foundation plan C1–C6)

Scope: ingest xStocks corporate actions and show, per stock, the company event separate from the
token treatment (scaled-UI-amount multiplier). Read-only.

## G1 — real xStocks corporate-action data
- CHECK: `GET /api/xstocks/corporate-actions?ticker=AAPL` (proxying xStocks public API).
- EVIDENCE (2026-09-16, dev server): AAPL → AAPLx, ISIN CH1436219187; 2 upcoming + 5 history + 5
  multiplier points. Real dividends stepping the multiplier 1.0026642→1.0032690, net $0.189/unit.

## G2 — company event vs token treatment kept distinct
- CHECK: each event shows caType/date/cashflow (company fact) AND the multiplierOld→New (issuer
  treatment) as separate lines; a null multiplier renders "Token treatment not confirmed".
- EXPECT: news is not corporate action; a split shows fromUnits→toUnits, a dividend shows net
  cashflow, and treatment is the on-token multiplier. ✓ (verified render)

## G3 — honesty / scope
- CHECK: the panel states events are the **Solana xStock** treatment and do not establish the Base
  (Coinbase) token's treatment; not investment advice.
- EXPECT: no invented amounts/dates; unsupported types show unknown, not guessed math. ✓

## Type/build
- CHECK: `npx tsc --noEmit` → exit 0. ✓

## Follow-ups
- [ ] Per-user position impact (needs holdings at event time; use historical multipliers, not
  today's). Chart event markers on the OHLCV chart.
- [ ] Base (Coinbase) token treatment from Base registry evidence — separate from xStocks.
