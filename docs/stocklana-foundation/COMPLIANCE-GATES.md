# GATES — Instrument facts / compliance (foundation plan L1–L4)

Scope: a product-facts panel in the stock workspace. Read-only; product info, not legal advice.

## G1 — real per-instrument facts
- CHECK: `GET /api/xstocks/facts?ticker=<T>` from the xStocks per-asset + status endpoints.
- EVIDENCE (2026-09-16): AAPL → Apple xStock, product ISIN CH1436219187, underlying ISIN
  US0378331005, US, 24/5, not halted. NVDA → underlying ISIN US67066G1040. Real underlying ISINs.

## G2 — honesty-critical facts present
- CHECK: the panel states product type (tokenized tracker certificate by Backed), **no shareholder
  voting rights**, issuer controls (Token-2022 pausable / permanent delegate / transfer hook — the
  issuer can freeze or move tokens, verified in S1), and redemption restricted to eligible parties
  (not guaranteed permissionless liquidity).
- EXPECT: ownership of an xStock is not described as conferring voting rights; redemption is not
  described as guaranteed permissionless. ✓

## G3 — scope / not legal advice
- CHECK: the panel labels itself product information, not legal/investment advice, and not a
  jurisdiction-eligibility determination; links the xStocks legal overview.
- EXPECT: no individualized legal eligibility finding. ✓

## Type/build
- CHECK: `npx tsc --noEmit` → exit 0. ✓

## Follow-ups
- [ ] Versioned per-action policy records (view/buy/redeem) server-enforced before actions.
- [ ] Live proof-of-reserves number per symbol (PoR endpoint is recency-ordered; needs a cached
  full map or a per-symbol endpoint).
