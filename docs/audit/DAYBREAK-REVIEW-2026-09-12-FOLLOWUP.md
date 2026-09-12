# Daybreak remediation review — 12 September 2026

## Resolution update — 12 September 2026

The five reliability findings below are now resolved across Daybreak and Muse:

- Solana launch recovery derives and stores the signed transaction signature before submission, scopes the record to the authenticated Privy user, binds signing to the reviewed Solana wallet, and renders recovered receipts from the immutable saved intent.
- Muse recovery retains the full forge operation through wallet confirmation. Unsafe legacy records are rejected instead of guessed as PFP operations.
- A failed free pull can only expose the paid alternative after a definite terminal failure. Pending and completed jobs reconcile without a payment prompt, and the paid alternative gets a new request ID rather than mutating the free job or its zero-cost reservation.
- Muse free-execution locks now use expiring, token-owned leases. Paid and free cleanup run independently with `Promise.allSettled`.
- News snapshots are stored per ticker with their original successful-fetch timestamp. In accordance with the product requirement, the latest saved stories remain available indefinitely during an outage, but mixed/old coverage is reported as stale and displayed as **Latest available**; an unrelated ticker refresh cannot renew an old story.

The follow-up hardening items are also addressed: the free entitlement and job row are created atomically, the database verifier covers all current schema tables, OpenLaunch uses actual Uniswap pool tick bounds and verifies the quote is a deployed token contract before salt discovery, and the signing wallet is rechecked immediately before a Solana signature. The remaining in-app stock/LP transaction surface is product scope, not a defect in the currently shipped read-only LP view.

Verification after the fixes: 27 Daybreak acceptance groups, Daybreak TypeScript, Muse TypeScript, both production builds, Muse atomic credit-retry, and Muse stale-calibration recovery all pass. No real-funds transaction was performed.

Reviewed Daybreak `f49c953` against `9c6b2c7`, and Muse `4b44a2d` against `bf071d8`. Review only; no application edits, payments, launches or database mutations. The earlier report describes the previous revision; this document supersedes its status where noted.

## Verification and improvements

- All **25 acceptance groups pass**, versus the prior failure after 11 groups.
- TypeScript and production build pass. Existing optional Farcaster Solana module and viem/Tempo warnings remain.
- App first-load JS decreased from approximately **924 kB to 871 kB** in the local build.
- Mocked Finnhub outage with an available snapshot now returns one saved article, `stale:true`, and one snapshot read. The prior company-news fallback defect is fixed.
- Muse now uses an independent free execution lock and a sponsored zero-charge credit reservation. This addresses both structural blockers previously identified; an authenticated zero-balance generation remains unverified.
- Existing paid jobs no longer become free simply by retrying with `freePull:true`.
- Free-pull errors no longer immediately request payment; the user sees a separate paid action.
- Solana form fields lock during preparation/review; required logo failures are surfaced, and unsupported description input was removed.
- Returned Solana payment signatures are persisted and polling failures with a known signature enter an unknown/recovery state.
- Exact bigint supply conversion and price-direction correction are useful improvements. This does not establish complete contract compatibility or deployment readiness.

These are substantial corrections to the right parts of the system. The outstanding findings are mostly incomplete failure recovery, rather than missing first implementations.

## Remaining findings

### P1 — Solana submission-response loss still bypasses recovery

`components/daybreak/StonkFunLaunch.tsx:120–123` submits before saving any operation. `paymentSignature` is populated only after the server response. If the server accepts the launch but the response is lost, the catch reaches lines 150–152 and returns to `ready`, incorrectly describing the situation as rejection before submission. A page reload has no operation to restore.

The conflict branch also lacks an operation/signature when submit throws and can leave the UI in processing without a usable status lookup. `reconcile` deletes any saved operation missing a signature (line 71), which would defeat a simple signature-less placeholder fix.

**Fix:** derive the signature from signed transaction bytes and durably record the exact operation before calling submit. Mark submission attempts unknown until reconciled; never infer non-submission from absence of an HTTP response. Persist per account/wallet and restore name/quote from the saved operation when showing a recovered receipt. A global localStorage key currently mixes accounts, and recovered success text still reads the current form.

**Acceptance:** backend accepts, connection drops before response, page reloads; the same signature is reconciled without another prepare/payment. Also test explicit pre-submit wallet rejection separately.

### P1 — Banner recovery metadata is still overwritten during payment

`MuseCreate.generate` now calls `recordSession()` before paying, but `pay` at `components/daybreak/MuseCreate.tsx:40` immediately replaces that complete record after signing with a smaller object lacking `ckind`, `pullGroup`, and `lane`. Confirmation is awaited at line 42; the full record is only rewritten after `pay` returns. The original confirmation-timeout/reload defect therefore remains. `recover` still defaults the missing kind to PFP.

**Fix:** pass an immutable operation record into `pay`; append only the transaction hash without discarding fields. Do not reconstruct capsule/stock from mutable component state. Store all pending operations rather than overwriting a single slot.

**Acceptance:** sign a banner payment, interrupt before receipt confirmation, reload, recover with kind=banner, the original capsule, and the original parent ID.

### P1 — Paid fallback is available while the free result is unknown or already complete

In `MuseCreate.generate`, the free-error branch reconciles the existing job but unconditionally calls `setFreeFailed` even when the job returned pending or completed. The resulting “Pay instead” button can request funds for a request that is still running or has already succeeded. Explicit wallet confirmation is required, but the app should not offer an unnecessary payment.

The server compounds this: `app/api/muse/[...path]/route.ts:47` calls `setJobPaid` before checking completion, fingerprint, or retry eligibility. That UPDATE is not status-conditional. A paid retry can change an in-flight/completed free job's billing label even when no retry is accepted. Switching a zero-charge reservation to a charged retry under the same ID also needs to account for Muse's reservation amount-consistency check.

**Fix:** offer paid conversion only after a definite, reconciled terminal outcome that allows it. Acquire the job transition atomically; validate its input and billing state before taking payment. Never relabel a completed or in-flight job. Quote using the stored capsule, not the current selection (the current `payInstead` calls a helper that reads current `capsule`).

**Acceptance:** lost response after free success produces the existing image and no payment action; pending produces status recovery only; paid conversion of an eligible failure preserves a valid reservation lifecycle.

### P1 — New free execution locks never expire after a process crash

`muse-mirror/lib/integrations/daybreak-payments.ts:24–25` inserts a lock with `created_at` and relies on DELETE in `finally`. There is no expiry or stale-lock acquisition path. A runtime timeout/process termination before cleanup leaves the request locked permanently; retry returns 409 forever. The Daybreak six-minute retry lease cannot clear the Muse lock. Additionally, the integration `finally` awaits paid-lock release before free-lock cleanup, so a paid cleanup error skips free cleanup too.

**Fix:** lease locks with an expiry and acquisition token; renew as needed, and only release a lock owned by the current attempt. Make free/paid cleanup independent. Keep the generation receipt as the idempotency authority after a crash.

**Acceptance:** interrupt a worker after acquisition; after the lease expires, the same request resumes or returns its completed receipt without generating a duplicate.

### P2 — Mixed news snapshots can keep old stories indefinitely and label them fresh

`lib/news/provider.ts:132–149` merges saved stories, then saves the entire combined set whenever even one ticker refreshed. `saveSnapshot` resets the timestamp for all items. A stale ticker can therefore survive indefinitely as other tickers refresh. The response uses `stale: !freshTickers.size`, meaning a partially stale result is marked fresh despite its comment promising otherwise. `checkedAt` is the response time, not source freshness, weakening the route's new age bound.

**Fix:** store original successful-fetch timestamps per ticker/item. Enforce age before merging and report partial staleness/coverage explicitly. Do not reset old items' age because another symbol succeeded.

**Acceptance:** one ticker remains unavailable for more than 72 hours while others refresh; that ticker's saved stories expire and are not silently renewed.

## Advice and next proof

The quality of this remediation deserves credit: it addresses billing in both repositories, restores the real test suite, improves data relevance, and reduces loading cost. Continue with a narrow reliability pass rather than adding another launch surface now.

Repair the five cases above and add fault-injection tests for them. The current 25 groups cover financial reads, news normalization and basic launcher math, but do not prove free entitlement, payment interruption, or Solana recovery. Then verify the two deployed revisions together and perform an authenticated free-pull → history → paid banner recovery journey. A real-funds launch remains a separate explicitly authorized verification.

Further follow-ups from the previous audit remain: atomic daily entitlement/job creation, chain-specific wallet binding at signing, production migration verification, proper openlaunch pool tick bounds and quote-token validation, and in-app stock/LP signing. This review did not test production deployment, authenticated generation, or any real transaction. No claim that all prior findings are resolved is warranted yet.
