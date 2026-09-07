# Daybreak and Patron: audit decisions

Scope: focused source-code review on 2026-09-07. This is a decision and implementation handoff, not a completed security audit, load test, or authenticated browser test. No new user account was created. Credentials were checked for presence only. Submission deadline and deployed state were not independently reverified in this pass.

## Patron: fix attribution before adding features

The strongest proposition is publicly verifiable campaign progress without a public supporter list. This makes privacy useful to a recognizable funding workflow. Lead the demo with a contribution and the resulting progress, then explain what remains public.

### Submission-critical

1. **Overlapping campaign attribution.** `src/lib/campaigns.ts` gives Season 02 and Night School the same beneficiary, with different start blocks. `src/lib/fundIndexer.ts` counts every pool-to-beneficiary transfer from the chosen start block through the current head. Withdrawals after the later start can count toward both campaigns. Shortest safe scope: present only one active campaign for that treasury. Longer-term: unique treasury per campaign, or explicitly non-overlapping time/block windows. Test that one withdrawal cannot increase two independent campaign totals. Also label totals as qualifying pool receipts: the current system cannot prove donor intent, unique donors, or exclude creator self-funding.
2. **Privacy language is too absolute.** README and campaign text claim supporters are invisible or anonymous. Prefer: the app does not publish a supporter list; contribution amounts and the pool-to-treasury transfer are public. Timing/amount correlation and deposit visibility still matter. Do not equate lack of a direct sender field with proof of untraceability.
3. **Submission proof boundaries.** `strk20.json` contains three mainnet transaction hashes, a live URL and video URL. Confirm organizer acceptance and playable video before the deadline. Existing SDK transaction evidence does not by itself demonstrate that a new user's browser-wallet flow completes. State which path the demo actually proves.

### Other concrete findings

- `fetchPledges` stops at a page cap but returns the accumulated list without a partial flag. Large campaigns can display an incomplete total as complete. Return coverage and continuation state; index incrementally.
- Proposal POST accepts unauthenticated submissions, parses the full body, and has no route-level rate limit. Add bounded body parsing, ingress rate limits and moderation. Anonymous proposals can be intentional, but are not authenticated creator claims.
- Keep the existing no-escrow/no-refunds disclosure visible before contribution. Do not rush escrow or milestone contracts into the deadline window.

Decision: one compelling, attributable campaign and an honest end-to-end proof are worth more than additional campaign cards today.

## Daybreak: product direction

Build one connected loop: discover an asset → inspect its market → save or share it → discuss inside an interest circle → trade or provide liquidity → track the position. Preserve Daybreak's characters and blue identity while giving financial information a stable, readable surface.

### P0: account and truth of state

- Privy app ID, server secret and database URL are present locally. `AccountProvider` supports Google, Apple, passkey and wallet login. This proves configuration presence, not successful authentication or enabled provider settings.
- Account creation is buried in the profile preferences. Put a visible Sign in / Create account action in the header for guests. Keep anonymous discovery available. On success show the actual authenticated identity, then verify `/api/me` and persistence across another session.
- `SignInSheet` does not check provider readiness, closes immediately after requesting login and exposes setup details if configuration is missing. Disable methods while initializing, retain a recoverable error path, and show product-facing failure copy. Verify allowed origins and enabled methods in Privy, including the exact localhost origin. Do not assume Apple/passkey registration works because a button exists.
- `useAccountData.serverEnabled` is true for authenticated users unless the error is 503; it can be true during loading or a 401/500. The profile then says “Synced privately” prematurely. Model loading, synced, saving, offline, expired-session and failed states explicitly. Only claim synced after successful server data/write confirmation.
- Save/join interactions optimistically update local UI. Add clear failure feedback and rollback/reconciliation, particularly when both the mutation and subsequent refetch fail.

### P1: avatar theme interaction

Replace the header avatar profile link with a real accessible theme button. The existing You navigation remains the profile route. Click causes a short head nod/tilt and toggles the existing persisted theme; expose an accurate accessible label and pressed state. Honor reduced motion. Use the same theme setter as profile preferences so both controls agree. Add a subtle sun/moon cue or first-use tooltip: hidden interactions alone are hard to discover.

### P1: charts and native asset workspace

- `MemeChart.tsx` renders hourly closes as a static SVG. The lack of interaction is in Daybreak's renderer, not inherently in the data vendor.
- The chart API chooses a token's top pool, then requests pool candles without explicitly binding the priced side to the requested token. Verify token orientation before trusting the chart, especially for stock-quoted memes. Return selected token, pool, quote currency, source and timestamps with candle data.
- Choose an interactive financial chart component after checking current documentation and license. Required: candles/line switch, crosshair, timestamp/price tooltip, pan/zoom, volume, timeframes, mobile gestures, dark theme and accessible text summary. Retain OHLCV rather than discarding all but close. Provider coverage determines available intervals; never invent candles.
- Use one asset workspace for overview, chart, activity, news, community and trade/LP. Keep selections in URL state for sharing and browser back. On mobile, prioritize chart and a persistent action bar over a tall modal full of unrelated panels.
- Keep source/explorer links as optional evidence. Native wallet signing should follow an in-app quote/review/receipt flow. Current LP confirm is disabled; do not present this as completed execution.

### P1: social usefulness

Circles currently render hardcoded groups and illustrative holder rankings. Real account membership storage does not create a live social network. Replace the sample ranking as the centerpiece with shared discoveries, watchlists, follows and discussion. Ship public/private visibility and blocking/reporting with real sharing. Holdings visibility must be opt-in; asset interest is not proof of ownership.

The smallest useful social release: create a broader-interest circle, invite someone, share an asset with a short note, save another member's discovery, follow a public watchlist. These actions make the product's promise tangible.

### P1: load and reliability

- Caches, concurrency caps and rate limits in `lib/server/requests.ts` are process-local. Multiple serverless instances independently hit providers. A single shared rate bucket within an instance also lets traffic from one visitor exhaust availability for others.
- Move provider refreshes into a shared cache with request coalescing and bounded workers. Serve timestamped last-good data where suitable; expose stale status. Apply identity/IP ingress limits separately from vendor quotas.
- `/api/memechart` permits one active cache miss per instance: simultaneous distinct chart requests return busy errors. Use bounded queued work and shared candle caching, with timeouts/backpressure.
- Database construction uses transaction-pooler-compatible `prepare:false` but no explicit connection budget/timeouts. Set per-instance connection limits based on deployment concurrency and pooler capacity. Add query timing/error telemetry before claiming load readiness.
- Verify cold and warm concurrent discovery, distinct charts, login bursts, provider 429s, database timeouts and account switching. Measure latency/error rates rather than treating a successful build as a load test.

### Mainnet versus preview

The examined Base LP path uses real registered pool addresses; the identified unfinished surfaces are sample community content and disabled execution, not evidence that all of Daybreak is testnet. A full route inventory should check the preserved world experience and any legacy simulations separately. Label each surface accurately; do not replace sample values with invented live data.

## Implementation order

1. Patron campaign attribution and honest submission proof.
2. Daybreak account entry, readiness/errors and genuine sync status; test actual login with the owner.
3. Avatar theme toggle using existing persistence.
4. Correct token/pool candle identity, then interactive charts.
5. Shared cache/provider quotas and database connection budget.
6. Small complete circle-sharing workflow.
7. Native trade/LP execution with quotes, simulation, approval review, wallet confirmation and receipt reconciliation.

Current pass produces decisions only, following the owner's request to prioritize judgment and conserve implementation effort. The fixes above remain work to implement and verify.
