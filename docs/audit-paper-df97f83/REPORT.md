# Public paper market audit at df97f83

Scope: identity, privacy, recovery, publication, pagination, accounting and query growth. Application code was not changed.

## P1 — Private profile identity is exposed through unauthenticated paper APIs

Locations: `lib/db/schema.ts:15–24`, `lib/db/repo-theses.ts:143–180`, `lib/db/repo-theses.ts:418–430`, `app/api/profile-photo/[id]/route.ts:1–18`.

Profiles default to `private`, and the product copy says a photo appears with the identity shared inside Circles. The public paper market and portfolio queries nevertheless return `displayName`, avatar selection and `avatarUrl` without checking `profiles.visibility`. Anyone can fetch those endpoints, then fetch the immutable public photo URL. Public balances, trades and P/L are intentional; disclosure of a private profile name/photo is a separate privacy choice and is currently bypassed.

Return the stable paper participant ID for private profiles and include profile metadata only when visibility is public or the viewer is the same user. Existing public market participation should not silently publish a private profile photo.

## P2 — Publication idempotency is lost across reloads and account transitions

Location: `components/daybreak/theses/PaperTradingMode.tsx:35–50`.

The server correctly deduplicates a repeated `creationIntentId`, but the browser keeps that ID only in a React ref. If a publish commits and the response is lost, reloading/remounting creates a fresh ID and publishes a second thesis. A second path exists when account context changes before a successful response: the stale result is ignored, but `creationAttempt.current` is cleared before the context check, so returning to the original account cannot recover the committed thesis.

Persist an account-scoped creation envelope until a definitive response, as the trade path already does. Clear it only after the matching account consumes the successful result or after a definitive rejection.

## P2 — Sub-scale trades can create ledger activity without representable input

Locations: `app/api/theses/paper/[id]/trade/route.ts:14–21`, `lib/theses/paper.ts:45–62`, `lib/db/schema.ts:405–416`, `lib/account/request-guard.ts:5–9`.

The API accepts every finite amount above zero, while trade amounts are stored at 10 decimal places. With the initial curve, an input of `1e-11` produces a positive JavaScript quote, passes validation, and rounds to `0.0000000000` when stored. The trade still increments the public trade count and creates an activity row; repeated requests can manufacture activity and tiny positions without a representable debit. The only mutation limit is process-local, so it is not a durable abuse boundary across serverless instances.

Reject amounts below the database unit and require the rounded input, fee and output to remain positive before mutation. Add a database-backed or ingress rate boundary for public activity creation.

## P2 — Public identity pagination requires repeated full scans and sorts

Locations: `lib/db/repo-theses.ts:142–183`, `lib/db/repo-theses.ts:418–425`, `lib/db/schema.ts:386–417`.

Participant cursors and portfolio lookup compute `sha256('daybreak-paper:' || user_id)` inside each query. There is no stored/indexed public ID. Positions and balances then sort by that expression; balances also filter on the second column of a `(user_id, instrument_id)` primary key without a supporting instrument index. Signed-in clients bypass the public CDN and poll this group of queries every eight seconds. Cost therefore grows with the participant and balance tables rather than the returned 50 rows.

Store a stable public ID with a unique index, index balances by `(instrument_id, public_id)`, and index positions by `(thesis_id, public_id)`. Use those columns for lookup and keyset pagination.

## Verification and limits

The existing follow-up regression suite remains green. Executable audit checks use the real quote function and assert the inspected privacy, persistence, precision and query-shape conditions, including positive controls. No authenticated production request, paper trade or thesis publication was performed. Query growth is established from schema and SQL shape; no production `EXPLAIN ANALYZE` was run.
