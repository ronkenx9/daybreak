# Daybreak backend audit — 2026-09-06

Scope: account client boundary, Drizzle repository/schema, all API routes, Bankr adapter, and live database grants. The findings below were reproduced first and then remediated in the same pass.

## Remediation status

All eight findings are fixed in the working tree. Account queries are identity-keyed and purged during identity changes; guest state is restored after logout instead of receiving server account data. Imports use an atomic transaction claim and a server-owned version. Shared authorization rejects inactive users. Private writes now use bounded JSON parsing, type/range checks, catalog validation, quotas and a per-user limiter.

Memestock discovery now verifies the expected stock is actually one side of the pool, treats DexScreener's USD price according to pool orientation, validates numeric/address/link data, propagates provider failures, preserves prior successful responses as explicitly stale, and bounds requests, concurrency, cache size and duration. Profile reconciliation now tracks dirty edits, uses server-returned versions and reports import/save failures.

## Findings

### 1. P1 — Private account state survives logout and account switching

`components/daybreak/useAccountData.ts:21` uses the same `['account']` cache key for every identity. Logout does not cancel or clear it. `DaybreakApp.tsx:32` also writes server-hydrated private profile/bookmarks/memberships into a shared anonymous localStorage record. Logout resets hydration flags but does not clear visible state. A subsequent user can see the previous user's data, and an import can copy that data into another account.

Reproduced the cache behavior with the installed QueryClient/QueryObserver: a disabled account observer still returned account A. Source inspection confirms there is no identity-scoped key or cache removal. This is a browser/session-boundary leak, not proof of a cross-user SQL query flaw.

Fix: key queries by Privy DID, cancel/remove private queries on identity changes, reset displayed state, and separate guest storage from account state. Test A → logout → B including an in-flight A request.

### 2. P1 — Imports bypass profile concurrency and can partially commit

`lib/db/repo.ts:97-117` checks the import marker before multiple independent writes and inserts the marker last. Concurrent requests can both pass the check. A later failure leaves earlier bookmarks/memberships committed. Profile writes at line 114 neither check nor increment `profiles.version`, so a stale profile PATCH can succeed after an import and silently overwrite it. The caller controls the import version, allowing repeated profile overwrites under different keys.

Fix: one transaction with an atomic import claim, server-controlled import version, and explicit profile merge/version semantics. Test duplicate concurrent imports, rollback after injected failure, and an import racing a profile edit.

### 3. P2 — Suspended users are still authorized

`lib/account/auth-server.ts:37` returns `resolveUser` without checking `users.status`. Setting an existing user inactive/suspended does not stop their valid Privy token from reading or mutating account data.

Fix: enforce active status in the shared authorization gate, return 403, and test all private endpoints with a suspended identity.

### 4. P2 — Account writes accept unbounded and malformed input

`app/api/me/import-local/route.ts:9` passes unvalidated collections into the repository. A string/object in `bookmarks` or `memberships` reaches `.filter` and becomes a 500. Large arrays become large inserts; there is no request-body limit, per-account write limit, or bookmark quota. Bookmark IDs are regex-validated rather than checked against the supported catalog. This permits arbitrary rows and database work from a valid account.

Fix: bounded request parsing, array/type/finite-number validation, a supported identifier policy, maximum collection sizes, and per-user write limits. Return 400/413/429 before database writes as appropriate.

### 5. P2 — Meme quote tokens receive the stock base-token price

`lib/base/memecoins.ts:64-80` correctly chooses the opposite token when the stock is the base token, but still copies the pair's `priceUsd`. That field describes the base token. A stock-base pool therefore labels the stock price as the meme token price.

Mock probe: stock as base, meme as quote, pair price 200 → returned meme price 200. Fix by obtaining the opposite token's validated USD price or returning unavailable; test both pool orientations. Also require that one pool side matches the expected stock address before labeling it paired.

### 6. P2 — Provider outages become successful empty meme feeds

`lib/base/memecoins.ts:51-56` converts HTTP failures and network exceptions into `[]`. The routes then cache these as successful results. A failed refresh can replace useful trending data with an empty list and prevent the UI error state from appearing.

Mock probe: provider HTTP 429 → `[]`. Fix: propagate typed upstream errors, preserve prior successful data with stale/error metadata, and distinguish a verified empty result from an unavailable provider.

### 7. P2 — Meme endpoints lack bounded upstream work

`app/api/memecoins/trending/route.ts:11` has no in-flight deduplication or rate limit. Each simultaneous cache miss fans out over all 13 stocks. `lib/base/memecoins.ts:51` has no abort timeout. The ticker endpoint also retains an unbounded map of arbitrary syntactically valid tickers, including unsupported ones.

Fix: reuse bounded/coalesced request infrastructure, validate supported tickers before caching, cap cache entries and upstream concurrency, add timeouts and ingress limits. Existing process-local limits elsewhere do not provide deployment-wide limits.

### 8. P2 — Profile sync stops updating fields after first hydration

`components/daybreak/DaybreakApp.tsx:34` refreshes `profileVersion` on every account response but only applies the name/avatar once. An edit from another device can therefore update the local version while leaving stale local fields. The next save sends those stale fields with the new version and overwrites the remote change. Mutation failures are not surfaced, and the import button marks completion before the request succeeds.

Fix: reconcile clean fields on refetch, retain the version associated with dirty edits, show conflicts/errors, and mark import complete only after success. Test two devices editing different profile fields.

## Verified strengths

- Live read-only catalog query: 17 public tables, zero without RLS, zero granting SELECT/INSERT/UPDATE/DELETE to anon or authenticated.
- Private routes derive internal identity from a server-verified Privy token; they do not accept a caller-supplied acting user ID.
- Current bookmark/profile/membership repository operations scope queries by authenticated user ID; no direct SQL cross-user access flaw found in these paths.
- Parameterized Drizzle queries and server-only credential modules are in place.
- Bankr has a public capabilities route but no live swap/deploy execution route exposed in the reviewed app.

RLS/public-role revocation protects the direct Data API boundary. It does not replace user scoping in the privileged server connection. Reference: https://supabase.com/docs/guides/database/postgres/row-level-security

## Initial validation and limits

- `npm test`: all 17 existing core acceptance groups passed.
- `npm run type-check`: passed.
- Three targeted in-memory probes reproduced shared account cache retention, wrong-side meme pricing, and outage-to-empty conversion.
- Live catalog/grant check passed without reading user records.
- Existing core tests cover market correctness, news and wallet caching, but not private account route isolation, transactional imports, or the new meme provider paths.
- No interactive Privy login, production load test, live user mutation, or trade performed. Source-confirmed import/status issues were not exercised against real user records.

## Verification after remediation

- `npm test`: 23 acceptance groups pass (six new backend groups).
- `npm run type-check`: passes.
- Isolated production build: passes.
- Remaining external acceptance: perform the two-user/two-device Privy browser flow against the deployed environment. That requires interactive identities and is not simulated by the source-level suite.
