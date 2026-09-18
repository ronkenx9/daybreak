# Public paper audit fixes — 2026-09-18

All seven findings have a concrete remediation:

1. Preview creates an intent with minimum received (1% tolerance) and a 60-second deadline. The locked execution transaction checks both before any balance mutation.
2. User-scoped intent keys have a unique database index. A transaction-scoped advisory lock serializes retries; a payload hash rejects intent reuse for different trades. Retries return the original persisted receipt, including after quote expiry. Execution no longer depends on a post-commit market read. The UI retains intent on network/5xx/auth/rate-limit failures and offers a safe retry.
3. Feed mode/search are applied server-side before the page limit. Pages expose `hasMore`; direct app links fetch the thesis separately by ID/slug.
4. Public positions, balances and activity have navigable pages. Read-only repeatable-read snapshots keep curve prices and position calculations consistent. An owner outside the current page still gets their own position.
5. Paper is explicitly described as simplified practice in creation, trading and public sharing: constant-product curve, fixed 2% input fees, no graduation. Live's scheduled/dynamic fees, quote-token fee collection and graduation are explained. Exact Meteora parity is not claimed.
6. The headline now says mark-to-market P/L, with a separate estimated-exit P/L after current impact and fees. Rankings say tokens held, not trading skill.
7. Participants have stable public identifiers derived from internal random UUIDs, profile links, and public portfolio pages showing available balances and paginated thesis positions. Authentication identifiers are not returned.

## Verification

- `node scripts/test-paper-behavior.cjs`: exercises price drift, minimum output, expiry, mark-to-market versus exit valuation, pagination validation, and route error classification (unknown commit failure stays 500; known rejected previews return 409).
- `node scripts/test-paper-database.cjs`: runs actual repository code against an isolated PostgreSQL database. Covers simultaneous duplicate requests, changed-payload replay rejection, replay after expiry, competing spends across markets sharing a stock balance, rejected-trade rollback, two participants, full sell, hashed public portfolios, direct lookup/search past 40 markets, Live filtering behind newer Paper markets, and public lists past 50 rows.
- Existing 43 acceptance groups, TypeScript and production build are release gates.
- Migration 0019 adds nullable intent columns for existing receipts and a unique user/intent index. Applied to the configured database.

The optimized browser creator was checked for the public disclosure and simplified-model explanation. No real funds or production test trades were used. Tests exercise repository transactions and isolated route behavior; they do not claim an end-to-end Privy sign-in session.

## Run isolated database checks

The script uses localhost port 55439 and the current operating-system username, never DATABASE_URL. Start a disposable local PostgreSQL cluster with `initdb -D /private/tmp/daybreak-paper-audit-pg -A trust --no-locale -E UTF8`, then `pg_ctl -D /private/tmp/daybreak-paper-audit-pg -l /private/tmp/daybreak-paper-audit-pg.log -o '-p 55439 -h 127.0.0.1 -k /private/tmp' start`. The test creates and drops its own randomly named database. Stop the cluster with `pg_ctl -D /private/tmp/daybreak-paper-audit-pg stop`.
