# GATES — PreStocks discovery + pre-IPO news (Track A)

Verified 2026-09-17 against live sources. Each gate has a runnable CHECK and the EXPECT it met.

## G1 — Registry matches on-chain reality
CHECK: `getMultipleAccounts` for all 8 registry mints on Solana mainnet.
EXPECT: every mint owned by Token-2022 (`TokenzQ…`), decimals 9, scaledUiAmountConfig present.
RESULT: PASS — all 8 (ANDURIL, ANTHROPIC, FIGUREAI, KALSHI, NEURALINK, OPENAI, POLYMARKET, SPACEX)
returned T22 / dec=9 / scaledUI=true. (xStocks are dec=8 — not copied.)

## G2 — Prices route serves live PreStocks data
CHECK: `curl localhost/api/prestocks`.
EXPECT: 8 items, each with tokenPrice, impliedValuation, premiumPct; `stale:false` when upstream up.
RESULT: PASS — 8 items, live values (e.g. ANTHROPIC tokenPrice ~985, impliedVal ~1.61T),
`stale:false`. Only registry symbols are admitted; identity is the verified mint, not the API's
contract_address.

## G3 — Pre-IPO news source works for PRIVATE companies
CHECK: GDELT Doc 2.0 keyword query per company name.
EXPECT: real recent headlines with source domains (Finnhub company-news cannot cover private cos).
RESULT: PASS — verified live headlines for Anthropic, OpenAI, Kalshi, SpaceX (e.g. Kalshi →
bostonherald.com; OpenAI → iheart/memeburn). GDELT enforces ~1 req/5s and throttles with slow
429s; the route treats any non-JSON/non-2xx as a soft miss and serves last-good. Prod caches each
symbol in `feed_snapshots` for 15 min, so cold-cache fan-out is at most one call per symbol per
15 min — within GDELT's limit. Under a test-side throttle the UI shows "Finding recent coverage…"
then falls back gracefully; it never crashes.

## G4 — Discovery UI renders live, dark-mode-first
CHECK: open /app → Pre-IPO tab; open a company detail.
EXPECT: 8 cards (logo, token price with shine, implied valuation, up/down premium badge); detail
dialog shows token/mark price, implied valuation, premium, Trade-on-PreStocks link, live news lane,
and the no-rights/SPV compliance note.
RESULT: PASS — grid verified (Polymarket +0.5% green, SpaceX −18.5% red, etc.); OpenAI detail
shows $1,028.04 / mark $962.97 / $1.27T / +6.8% and the compliance note. Reuses the existing
`db-company-dialog` (already dark-themed + mobile bottom-sheet).

## G5 — Holdings include PreStocks
CHECK: `/api/prestocks/holdings?address=<solana>` and the Holdings page.
EXPECT: Token-2022 enumeration matches verified PreStocks mints; a holder sees a valued row.
RESULT: BUILD VERIFIED; row-render needs a funded test wallet holding a PreStocks token
(same gate as xStocks holdings). Reader mirrors the proven xStocks reader; base58 validated;
scaled uiAmount used directly.

## G6 — No regressions / build clean
CHECK: `npx tsc --noEmit`.
EXPECT: exit 0.
RESULT: PASS. Also fixed a pre-existing crash: MemeChart threw "data must be asc ordered by time"
on duplicate timestamps (crashed the whole discover page); paint() now dedupes + sorts before
setData.
