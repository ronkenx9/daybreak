# Audit of public paper markets at 2571241

Resolution: all three findings were fixed after this audit. Cross-tab writes now reject a different unresolved intent and synchronize through storage events; publication uses a database-backed creation intent and request hash; pagination transitions are locked and cursor pushes are deduplicated.

Scope: recovery, creation, public discovery and pagination. The original audit was read-only; the resolution note records the subsequent application changes.

## P2: A second tab overwrites unresolved trade recovery

Location: lib/theses/paper-pending.ts:46–47 and PaperTradingMode.tsx:43,48.

Open the same market/account in two tabs before trading. Tab A submits an intent and loses the response. Tab B still has null pending state, because recovery is read only on account/market changes and there is no storage subscription. B writes a new intent to the same account/market key, replacing A. When B succeeds it deletes that key. Reloading A now loses the only persisted retry identity for its uncertain trade. Server idempotency protects repeated use of the same intent, but cannot protect a replacement with a new ID.

The reproduction uses the real storage helpers and proves overwrite followed by deletion. Persist unresolved intents separately and coordinate tabs; do not overwrite an unresolved record.

## P2: Retrying publication can create duplicate public theses

Location: app/api/theses/paper/route.ts:16–18; lib/db/repo-theses.ts:100–119.

Creation commits before the subsequent public lookup and response. If that lookup fails or the response is lost, the UI reports failure and permits retry. Each request creates a new slug/row, without a creation idempotency key. Retrying therefore publishes another market and consumes another of the five daily publication slots. A persistent creation intent should return the previously created thesis on retry.

Evidence: source trace through route, repository transaction and randomized thesisSlug. No production publication was performed.

## P2: Repeated Next clicks corrupt page history

Location: components/daybreak/theses/PaperTradingMode.tsx:41,50.

While the next page is fetching, the component leaves the previous market and enabled Next button visible. Every click appends that previous response's next cursor. Two clicks produce [null, cursor-one, cursor-one]; Previous subsequently reloads the same page instead of moving back. The same issue applies to positions, balances and activity. Disable transitions while loading, or bind/deduplicate transitions against the current cursor and response.

The reproduction evaluates the current changePage function extracted from the component and confirms the duplicate stack.

## Verification and limits

Existing test-paper-followup.cjs passes. Audit reproductions exercise the actual pending helpers and pagination callback. Publication failure is source-traced, not an authenticated browser reproduction. No signed-in browser flow, production deployment health or real-funds execution was tested. Passing the existing helper tests does not establish end-to-end multi-tab recovery.
