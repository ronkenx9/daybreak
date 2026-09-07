# Daybreak — Monetization

> Direction doc · 2026-09-07 · not yet built
> Owner: ronkenx9 · maintained with Codex (see `~/brain/projects/DAYWORLD.md`)
> This decides the shape on paper before any payment code lands. Nothing here is
> implemented. When it is, each rail gets its own build doc and honest fail-closed
> posture, consistent with the rest of the app (no fabricated receipts, ever).

## 1. The core distinction

Two different revenue rails get conflated because both touch Base + USDC. They are
not the same thing and should not be built as one:

| | **x402 (sell an API to machines)** | **Builder Codes / integrator fee (earn on routed trades)** |
|---|---|---|
| What it is | Server answers `402 Payment Required`; caller pays USDC on Base, retries with proof, gets data | An attribution tag + optional fee on swaps/LP Daybreak routes for a user |
| Who pays | Other agents, bots, apps calling our endpoints | Daybreak's own users, executing a trade/LP |
| Mechanism | HTTP 402 + x402 facilitator on Base | Fee/attribution field on the swap/LP call (0x / Bankr / Aerodrome) |
| Needs a Builder Code? | No — a Builder Code is just a **label** for dashboard attribution | This is where a Builder Code actually attributes volume |
| "See it in Base Dashboard" | Only if we tag our facilitator settlement | Yes — routed swap/LP volume shows here |

**Takeaway:** x402 monetizes *our data to machines*. Builder Codes attribute *our
users' onchain trades*. The builder-code signup being down blocks only the
attribution label, not building either rail.

## 2. Rail A — sell Daybreak's data via x402 (the natural fit)

Daybreak already computes something differentiated and hard to get: the
**verified memestock ↔ tokenized-stock pairing feed** — real on-chain pool
linkage (`lib/base/memecoins.ts`), de-spoofed, filtered, labeled, ranked across
1H/6H/24H volume, liquidity and market cap. That derived layer is *ours*, not a
DexScreener passthrough. It is the flagship x402 product.

### What to gate (in priority order)
1. **`GET /api/memecoins/trending`** — the ranked cross-stock pairing feed. The
   single most sellable endpoint: a bot builder cannot easily reproduce the
   verification.
2. **`GET /api/memecoins?ticker=` ** — per-stock community-token pairings.
3. (later) **`GET /api/prices`** aggregated Base tokenized-stock oracle reads —
   lower value, more replaceable; gate only if there's demand.

Keep the **human web UI free**. Only the programmatic/agent path pays. A gated
request looks like: no payment → `402` + payment requirements (amount, asset =
USDC on Base 8453, pay-to, facilitator); pay → retry with `X-PAYMENT` proof →
`200` + JSON. The existing rate-limit/cache wrapper (`lib/server/requests.ts`)
stays as the free-tier throttle.

### Pricing (starting point, revisit with real usage)
- Trending feed: **$0.002–0.01 / call**, USDC on Base.
- Per-stock pairings: **$0.001–0.005 / call**.
- Micro amounts are the point — x402 is built for sub-cent metered access with no
  account and no key.

### Why this and not a human paywall
x402 is weak for humans (nobody wants a per-click 402). Its strength is the agent
economy: machine callers, no signup, no key rotation. Daybreak's data is exactly
the kind of thing a trading bot or another app would pay per-call for.

## 3. Rail B — earn on the trades and LP Daybreak routes

This is where Builder Codes and an integrator fee actually live, and it depends on
in-app execution shipping (currently the buy path and LP are read-only + external
handoffs; native execution is gated — see `docs/BANKR-INTEGRATION-PLAN.md`).

- **Swaps** (Bankr / 0x, when in-app buy lands): take a small integrator fee and/or
  attach a Builder Code so routed volume is attributed to Daybreak in the Base
  Dashboard.
- **Stock LP** (Aerodrome Slipstream Earn tab, AAPL/NVDA/GOOGL/META): once
  positions are opened *in-app* (wallet-signed, no bankr.bot redirect — see the
  LP surfacing change 2026-09-07), the same attribution applies.

A Builder Code is a **one-field add** here — it does not gate the feature. Build
the execution rail first; drop the code in when the signup works.

## 4. Honest constraints (do not skip)

- **Facilitator dependency.** Rail A needs an x402 facilitator on Base to verify
  and settle payments. Check whether the open/public Base facilitator is usable
  before assuming the (currently unreachable) Coinbase builder-code path is
  required. If the open facilitator works, Rail A can ship now; the Builder Code
  is attribution-only.
- **Sell the derived layer, not upstream feeds.** Re-selling raw DexScreener /
  Chainlink / GeckoTerminal data likely violates their terms. Our sellable value
  is the *verification and pairing*, not the passthrough. Legal/terms check is a
  gate before charging.
- **No fabricated settlement.** Same rule as the rest of the app: a payment either
  verifiably settled or it did not. Fail closed; never serve paid data on an
  unverified proof.
- **US / eligibility.** Tokenized-stock trading already carries jurisdiction
  limits (see StockDetails caveats). Monetizing routing does not change who is
  eligible to trade; keep the existing disclaimers.

## 5. Sequencing

1. **Confirm the facilitator** — can we settle x402 on Base via the open
   facilitator today? (Unblocks Rail A independent of the builder-code site.)
2. **Terms check** — confirm we can sell the derived pairing feed.
3. **Gate one endpoint** — wrap `/api/memecoins/trending` with x402 behind a
   `X402_ENABLED` flag; free UI path unchanged. Fail-closed when unconfigured.
4. **Instrument** — log paid calls; measure whether any machine demand exists
   before widening.
5. **Builder Code** — when the signup works, add it as an attribution field to
   the facilitator settlement (Rail A) and to routed swaps/LP (Rail B).
6. **Rail B execution** — depends on native buy/LP execution landing first.

## 6. Open questions (owner decisions)

- Is the open Base x402 facilitator acceptable, or do we wait for the Coinbase
  builder-code path specifically (for the dashboard attribution)?
- Is there confirmed appetite from any agent/bot to pay for the pairing feed, or
  is this speculative build? (Affects whether Rail A is worth it before Rail B.)
- Do we ever want a *human* paid tier (premium alerts, real-time vs delayed)? If
  so that's a Privy-account subscription, out of scope for x402.
- Integrator-fee size on routed trades/LP — and does taking a fee change the
  eligibility/disclosure story?

## 7. Status

Nothing implemented. Builder-code signup reported down by owner 2026-09-07 — hold
on the code, it does not block Rail A. LP Earn tab surfaced in-app the same day
(no bankr.bot redirect); native LP/swap execution still gated pending a verified
per-user signer path.
