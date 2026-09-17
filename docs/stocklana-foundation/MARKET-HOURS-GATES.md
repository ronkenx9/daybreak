# GATES — Market-hours labeling (plan P3, free)

Scope: label equity prices by US market session (live / pre-market / after-hours / last close),
no credentials. Holiday dates sourced from Pyth free `get_symbols` equity sessions.

## G1 — session computed correctly (NYSE, America/New_York)
- CHECK: `usMarketSession(t)` across known times.
- EVIDENCE (2026-09-16/17): Thu 10:00 ET -> regular/open; Thu 05:00 ET -> pre; Sat -> closed;
  Christmas (weekday) -> closed; ~20:35 ET -> closed (past 20:00). Deterministic.

## G2 — surfaced honestly
- CHECK: `/api/equity-prices` returns `market:{session,open}`; Solana holdings show "live" only
  when the market is open, else "last close" / "pre-market" / "after-hours", and the heading shows
  the session. EVIDENCE: route returned `{session:"closed",open:false}` with real prices.
- EXPECT: a closed-market price is never labeled "live". PASS.

## Type/build: `npx tsc --noEmit` exit 0. PASS.

## Note
Holiday list covers ~Sep 2026 - Jul 2027 (Pyth window); refresh from get_symbols to extend. Live
Pyth prices still need a Pyth Pro access_token (separate, gated).
