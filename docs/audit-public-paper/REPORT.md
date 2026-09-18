# Public paper market audit

Reviewed 2026-09-18 against main b4b8545. Scope: source review and isolated numerical reproductions; no public trades or content were created. No application fixes were made.

The public simulation is a useful product direction, but it is not ready to be treated as a reliable social trading competition or a faithful rehearsal for the live market.

## Findings, ordered by priority

1. **P1 — Execution ignores the reviewed output.** `PaperTradingMode.tsx:32` submits only direction and input amount; `repo-theses.ts:192` requotes at execution without a minimum output, expiry, or accepted market version. Another participant spending 10 quote units between preview and execution reduces a 10-unit buyer's output from 3772.1324 to 3495.3043 tokens (7.3388%) without asking them to accept the change. Add a minimum-received constraint and quote expiry, enforced inside the locked transaction.

2. **P1 — Retried requests execute another trade.** The trade route and `repo-theses.ts:176-213` have no request identity or deduplication, and the trade table only has a newly generated row ID. If the commit succeeds but the response is lost, retrying spends again. The post-commit market read can itself fail, returning an error for a committed trade. Add a client-generated intent key, a database uniqueness constraint scoped to user, and a persisted receipt returned on retry. Verify using an actual transaction-level replay test.

3. **P1 — Discovery and shared-link navigation fail outside the latest 40 entries.** `/api/theses` defaults to 40 newest items. `ThesisHub.tsx:16-17` resolves the requested thesis and all search/mode filtering exclusively from that page. After 40 newer paper theses, an older live thesis disappears even in the Live tab, and its public page's app link falls back to the feed. Fetch the requested ID/slug directly; move mode/search filtering and cursor pagination into the API.

4. **P2 — “Everyone” is limited to 50 positions and 50 trades.** `repo-theses.ts:133-151` truncates every list with no cursor. The UI has no way to inspect earlier trades or participants beyond those rows. A separate viewer fallback helps the owner but does not make that participant discoverable to everyone else. Add paginated public positions, balances and activity with explicit counts.

5. **P2 — Paper execution does not reproduce the live curve.** `lib/theses/paper.ts` models constant-product reserves with a fixed 2% input fee retained in reserves. `lib/solana/dbc/config.ts` configures a Meteora market-cap curve, quote-token fee collection, scheduled 2%-to-1% fees, dynamic fees and migration. Paper sells charge the thesis token and never graduate. Either implement the same versioned live economics using the SDK's quote math, or explicitly describe paper as a simplified practice model and show the differences before users switch to Live.

6. **P2 — Headline P/L can look profitable immediately after an unprofitable round trip.** `paperPositionMetrics` values every token at marginal spot price. A first 10-unit buy displays +0.192 quote units; immediately selling the position returns a loss of 0.38135. Mark-to-market is a valid measure, but the UI calls it public paper P/L without explaining price impact and exit fees. Label it mark-to-market and show estimated exit value separately. Specify which measure ranks performance before adding competition/rewards.

7. **P2 — Public participants have no stable public identity in responses.** `repo-theses.ts:134-145,171` strips user IDs and returns mutable, potentially identical display names and avatars. The UI has no public participant link, and position keys combine display name with timestamp. Two people named the same cannot reliably be distinguished or followed across trades. Return a dedicated stable public profile identifier and link to that person's paper portfolio; never expose authentication-provider identifiers.

## Verification quality

`npm test` still passes all 43 groups while these gaps exist. The paper tests check a basic buy quote and finite metrics, plus source-string matches for locks/authentication/tables. `scripts/verify-public-paper-theses.mjs` is a static wiring check, not an integration test: it does not execute authenticated HTTP requests or database transactions. The earlier claim of integration verification was too strong.

Ran `node docs/audit-public-paper/reproduce.cjs`: numerical preview drift, mark-to-market versus exit loss, and the 40-row discovery boundary all reproduced. These examples use the actual pure paper pricing module; discovery uses an isolated fixture matching the inspected array behavior. No authenticated two-user transaction, retry, concurrent-spend or deployed browser execution was tested in this audit. Existing database locks are promising but need actual behavioral tests.

## Recommended order and UX

First fix accepted-price execution, replay safety and direct-link discovery. Then add paginated participant portfolios and activity, explain P/L, and align the paper/live economics. Test two authenticated users trading the same thesis, parallel spending across two theses sharing one stock balance, a lost-response retry, and deep links beyond page one.

For the consumer experience, lead with the thesis and paired stock, then price history, Back/Sell, participants and activity. Keep Paper unmistakable. Link each participant to a public paper portfolio. Prefer discovery filters for stock, recent activity and newest; raw holdings should be labeled as holdings ranking, not proof of investment skill. Public simulation is a stronger learning/social experience, but account farming can influence it; do not attach material rewards until that incentive model is addressed.
