# Follow-up audit — public paper markets

Reviewed main e2a2ce9 on 2026-09-18. No application code changed. This is a focused review of the latest paper-market fixes, not a whole-product security audit.

## Remaining findings

1. **P1 — Unresolved trade identity is lost when the component unmounts.** `components/daybreak/theses/PaperTradingMode.tsx:17,43,61` stores the intent only in React state and leaves Conviction navigation enabled while execution is uncertain. If the server commits and the response is lost, leaving/reopening the market or refreshing discards the key. A fresh preview creates another key and can repeat the spend. The database prevents duplicates only when the original key is reused. Persist a minimal pending intent per account/market, restore it on return, and reconcile against a receipt endpoint before allowing a new submission. Persisting a retry key does not make public paper balances private.

2. **P2 — Late mutation responses can override a different account's UI.** `PaperTradingMode.tsx:38,41-43` clears state on account changes, but create/execute continuations do not check identity or request generation. A trade started by A can finish after switching to B; its continuation displays A's confirmation and calls the old loadMarket closure. That closure increments the shared generation counter, potentially superseding B's new load, while authedFetch obtains whichever token is current. Old creation responses can likewise switch the active market after the account changes. Scope mutation results to the initiating identity and market, invalidate them on identity changes, and reconcile completed trades within the initiating account's pending-intent record. This is a UI attribution/state defect; no cross-account debit was demonstrated.

3. **P2 — Publishing bypasses the active feed filter.** `components/daybreak/theses/ThesisHub.tsx:19,21,24` correctly filters API reads, but onPublished prepends a paper thesis into items unconditionally. From the Live tab, create a paper thesis and return: the Live tab contains the paper entry. Search and later pages have the same inconsistency. Refetch the current query after publishing, or deliberately navigate to the Paper tab/page one and clear incompatible search state.

4. **P2 — Offset pagination skips participants when ranking changes.** `lib/db/repo-theses.ts:134,146,153` sorts mutable quantities/balances and uses offsets. If a participant from page two buys enough to move onto page one between reads, they appear on neither page the viewer saw; another participant is repeated. New trades also shift activity offsets. Repeatable-read makes one response consistent, not separate page requests. Use immutable activity cursors and a stable participant ordering or snapshot-bound ranking pagination. Provide live ranking separately from exhaustive participant browsing.

5. **P2 — Polling can discard every successful response on a slow connection.** `PaperTradingMode.tsx:35-36` starts a new request every eight seconds and increments generation on every request. When each request takes nine seconds, the next request starts before the previous finishes, so every completed response is discarded as stale. The market can stay loading forever while requests continue. Schedule the next poll after the current request completes, or prevent overlapping polls and abort stale requests only when identity/market/page changes.

## Verification and limitations

`node scripts/test-paper-behavior.cjs` passes. Source traces establish the missing durable client intent and identity guards. `node docs/audit-public-paper-followup/reproduce.cjs` reproduces the ranking boundary, nine-second response/eight-second polling schedule, and unconditional insertion into a Live feed using isolated transition models matching the inspected code. These are not mounted React/browser reproductions. No production trades, account switching, or network-failure injection was performed; the isolated PostgreSQL suite from the preceding release was not rerun because this audit changed no application code.

Prior fixes for locked minimum-output validation, persisted receipt deduplication, and separate exit valuation remain present. Exact Meteora parity remains explicitly out of scope for the simplified paper model; it is not a newly discovered regression.

Fix order: durable pending-trade recovery; identity-scoped mutation handling; feed refresh; non-overlapping polling; stable history/participant pagination. Add mounted component tests for these transitions—the transaction tests do not cover them.
