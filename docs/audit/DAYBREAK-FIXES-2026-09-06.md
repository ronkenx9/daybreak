# Daybreak audit remediation — 6 September 2026

All code findings in DAYBREAK-AUDIT-2026-09-06.md have been addressed while preserving the owner's rebuilt design. Live-service verification limits are listed explicitly below; this is not a claim of production readiness or a completed purchase.

## Delivered

| Finding | Remediation |
| --- | --- |
| Multiplier counted twice | Separate raw token and scaled share balances. Bigint valuation uses raw balance × total-return price. Related reads pinned to one Base block. |
| RPC failure shown as empty holdings | Complete/partial snapshots, failed-token names, timestamp/block; all-read failure returns 503. Quantities survive missing prices. |
| Missing Coinbase SDK | Installed Coinbase Wallet SDK and Base account dependency. Connector-specific imports eliminate missing optional-connector warnings. |
| Understated portfolio | Only fully priced positions contribute; explicit priced subtotal, missing coverage and aged references. |
| Unvalidated/stale oracle | Validate positive answers, round completion, timestamps, decimal range, expected description and registry pause state. Recompute age on server cache hits and client ticks. |
| Invisible async holdings | Holdings do not depend on a one-time reveal scan. Motion observes new reveal elements. |
| Account leakage / no refresh | Account-scoped query keys plus response-address guard; periodic and focus refresh, explicit retry and previous-snapshot states. |
| Misleading legacy instruments | Simulation-only typed fixtures; no fake explorer links or live purchase claims; live execution fails closed. |
| Registry / buying journey | Reviewed 13-contract scope and onchain identity checks, issuer/source/contract links, exact-address Uniswap handoffs. |
| News | Keyless attributed GDELT discovery, company headline matching, source links, deduplication, 15-minute cache, timeout/error/retry states. |
| Dialog / menu accessibility | Shared dialog initial focus, Tab trap, Escape and restoration; wallet menu arrow-key navigation and dismissal. |
| Additional observations | Bounded coalescing/cache/concurrency/rate limits; scope and address-transmission copy; reset includes Daybreak profile/bookmarks/circles. |
| Dependency findings | Patched Axios and Next's PostCSS via compatible overrides; install scan reports zero vulnerabilities. |

## Verification

- `npm test`: 17 passing acceptance groups. Split multiplier, mixed decimals, dust, partial price coverage, paused/stale/invalid oracle, partial/all-failed/zero holdings, HTTP contract, news URL/date/relevance handling, request coalescing/rate cap, exact outbound token binding, feed identity/pause enforcement, query-account isolation, SDK import.
- `npm run build`: passes TypeScript validation and production generation.
- Successful dependency install after patches: zero reported vulnerabilities. A subsequent redundant audit command was blocked temporarily by approval-service quota; the completed clean scan remains the recorded result.
- Live Base reads: all 13 reference prices returned HTTP 200. Known public address 0x0000000000000000000000000000000000000001 returned a complete, empty snapshot at block 50935453. No user wallet queried.
- Browser: stock dialog initial focus; Tab to close; Escape restores trigger. Wallet menu opens with first option focused, Down navigates, Escape restores trigger.
- Final build: supported-stock scope and oracle-reference labels present. Mobile stock dialog at 390 × 844: document and dialog both 390 pixels wide, no horizontal overflow.
- Uniswap handoff opens Base AAPLc as the buy token; venue displays Apple-specific market-hours information. No wallet connected, terms accepted or trade executed.

## Explicit limits

GDELT returned public article data on a direct HTTP check, but live app checks also encountered provider failure; another direct check returned 429. The app correctly displays temporary unavailability rather than invented or stale-as-current news. Treat successful news delivery as an unresolved upstream reliability check. For public scale, use a provider with suitable redistribution terms and service guarantees, or a shared scheduled cache.

Account switching is regression-tested at query-cache level, not against a funded browser wallet. Connect/reject/disconnect/reconnect with an actual wallet remains an integration test requiring the owner. External deep links prove correct selection, not liquidity or eligibility.

Rate limits/cache are per process. Production needs shared ingress limits and a provisioned RPC. Community members/rankings remain labeled examples. Legacy room purchases remain simulations. No deployment performed.

Build has a nonfatal transitive ox/viem Tempo dynamic-import warning and a Node experimental localStorage warning. Missing Coinbase SDK warnings are resolved.

## Resources

- https://docs.base.org/specifications/b20/tokenized-stocks-on-base
- https://www.coinbase.com/tokenize
- https://gdeltproject.org/about.html
- https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
- https://developers.uniswap.org/docs/trading/custom-interface-links
