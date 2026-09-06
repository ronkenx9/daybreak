# Daybreak core-product audit — 6 September 2026

Verdict: promising discovery product; not ready to present dependable portfolio values. Preserve the rebuilt design. Correct the financial data pipeline before expanding features.

Scope: current source, isolated production build, targeted regression probes, official integration documentation, read-only Base mainnet metadata calls and the running local preview. Source was changing during the session; source-snapshot.json identifies the files reviewed. No wallet connected, signature requested, money moved, deployment made, or production code corrected by this audit.

## Findings, in priority order

### P1 — Portfolio value applies the B20 multiplier twice
Evidence: lib/base/holdings.ts:21 reads scaledBalanceOf and calls the result shares; components/daybreak/DaybreakApp.tsx:35 and :40 multiply those shares by the total-return token price from lib/base/prices.ts. The ABI file itself documents that the price already includes the multiplier.

Reproduction: 10 tokens, multiplier 2, underlying share price $100. scaledBalanceOf becomes 20 shares; token price is $200. UI displays $4,000; correct position value is $2,000. Regression probe confirms the calculation. All 13 live multipliers were 1 at block 50934962, so today's happy path hides the error.

Fix: return raw balanceOf separately from scaledBalanceOf; value raw token quantity × total-return token price. Show scaled shares as a distinct quantity. Use exact integer/fixed-point arithmetic until presentation; the current field called raw actually contains scaled units. Add split/dividend fixtures and mixed-decimal tests. Pin related reads to one block.

### P1 — Failed holdings reads become a false empty portfolio
Evidence: lib/base/holdings.ts:31 silently skips failed multicall entries. app/api/holdings/route.ts:18 returns HTTP 200 with holdings:[] after an RPC exception. DaybreakApp.tsx:25 ignores response status/error and converts failures to an empty array. Line 40 then says the wallet owns no tokenized stocks.

Reproduced both all-contract failure and full RPC failure. Partial failure also hides affected assets.

Fix: represent success, partial and unavailable explicitly, with failed-token counts and observation time/block. Return a non-success HTTP status for complete failure. Keep previous data labeled stale while retrying; never convert unavailable into zero.

### P1 — The Coinbase wallet connector is missing its runtime SDK
Evidence: lib/base/wagmi.ts configures coinbaseWallet. package.json does not install @coinbase/wallet-sdk; require.resolve fails. The isolated production build warns that the connector cannot resolve it. The connector's getProvider dynamically imports this module.

Fix: install the SDK required by the chosen connector, or deliberately configure the Base Account connector with its own required dependency. Resolve selected-connector warnings, then exercise connect/reject/disconnect/reconnect and account changes. Other unused optional-connector warnings also appeared; do not confuse them with the actively selected Coinbase dependency.

### P1 — Missing prices silently reduce portfolio totals
Evidence: DaybreakApp.tsx:35 adds zero whenever a holding's price is absent. A positive position with an unavailable oracle can therefore produce a $0 total; a mixed portfolio produces an understated total without a coverage warning.

Fix: only label a total complete when every included position is priced. Otherwise show a priced subtotal, missing-position count and clear unavailable state. Preserve quantities independently of valuation.

### P1 — Price validation and freshness are insufficient
Evidence: lib/base/prices.ts:30–38 accepts any returned answer and timestamp. A negative answer with a future timestamp is accepted as fresh by the regression probe. app/api/prices/route.ts:21 can reuse cached data without recalculating its stale flag. DaybreakApp fetches prices once and renders stale values as “at last close” regardless of the cause.

Fix: validate positive answer, timestamp bounds and feed metadata; read relevant pause state, expose exact as-of time and source. Separate unavailable, aged, paused and market-closed states. Recompute freshness when serving cached responses and in the client; add bounded refresh and request deduplication. An oracle reference price must not be described as an executable quote.

### P1 — Holdings inserted after a network response can stay invisible
Evidence: DaybreakApp.tsx:40 mounts the holdings list with data-reveal only after a positive holdings response. Motion.tsx:50 observes matching nodes once per pathname. It does not observe elements added later. app/daybreak.css:225 leaves unobserved data-reveal nodes at opacity:0.

Trigger: open Holdings, connect or load an existing positive wallet after Motion's initial scan. The rows are mounted but never registered for reveal. Static/source-confirmed timing defect; not exercised with a real funded wallet.

Fix: use an element-level reveal ref/observer lifecycle, or explicitly reveal asynchronously mounted holdings. Test a delayed positive response with motion enabled.

### P2 — Wallet/price state does not refresh reliably
Evidence: DaybreakApp.tsx:24 fetches prices once; :25 only reloads holdings when address/connection changes. Existing holdings are not cleared when switching from connected wallet A to B, while the new request is pending. The old portfolio summary can temporarily be associated with the new address. Purchases/transfers in another app are not detected while this page remains mounted.

Fix: key data by chain and address; clear or isolate previous-owner data immediately; refresh on focus, explicit action and a bounded interval. Include source block/time. Abort or invalidate stale requests. Distinguish wallet connectivity from authenticated identity before future public profiles or leaderboards.

### P2 — Legacy room still presents invented instruments as purchasable securities
Evidence: lib/catalog.ts contains placeholder addresses, active venues, invented issuer combinations and fixed rights statements. CompanySheet.tsx:145 presents fractional acquisition as available; InstrumentSheet.tsx:103 links those addresses to an explorer. Simulated receipts link to nonexistent transactions. The room banner identifies simulation, but inner financial claims conflict with that label.

Fix: quarantine simulation instruments in a fixture-only schema. Real routes must resolve the issuer-verified registry by chain/address. Remove fake explorer links and make every fixture sheet explicit. Do not let the real connector later inherit the old fixture purchase path. Live execution currently rejects correctly in lib/web3.ts.

### P2 — Requested news and purchase journeys remain absent
Evidence: no news route/provider in the reviewed tree. The token dialog says buying comes next but offers no venue link, prospectus or full address. The existing token list is static and its verified booleans are not enforced by runtime reads.

Fix: start with one reviewed registry and exact-address external venue links, with eligibility and issuer documents beside them. Add company news with source/time and outbound article links. Keep in-app execution a separate gate requiring a genuine quote, explicit review, correct spender, receipt reconciliation and tested failures.

### P2 — New token dialog lacks keyboard focus management
Evidence: selectedToken effect at DaybreakApp.tsx:26 locks scrolling and handles Escape only; dialog at :43 has no focus placement, trap or restoration. The older company dialog has a fuller implementation.

Fix: reuse a shared accessible dialog primitive. Give the wallet menu a keyboard/focus lifecycle and aria-expanded as well.

## Additional observations
- Holdings scope is this allowlist on Base; it cannot see brokerage stocks, exchange custody, other chains or every wrapped/lent position. Explain that scope.
- Public endpoint address validation exists, but holdings requests have no rate limits, concurrency cap or duplicate-request coalescing. Add them before public traffic.
- ShareModal says wallet/holdings never leave the device; the new client sends addresses to the holdings API, which reads an external RPC. Narrow that promise to the share-link payload.
- resetAllData removes old world/settings/receipt keys but leaves daybreak_profile_v1, including nickname, bookmarks and circles.
- The local preview on port 3017 served the earlier six-company UI during this audit; source had the newer wallet/price code. Do not use that preview as proof the newest integration works.
- The extra stock-list scrape produced earlier in this session is research evidence only. The public stocks page lists 10 entries; the technical docs list 13. All 13 source mappings passed metadata checks. A scraped public page alone should not silently remove the other three.

## Verified strengths
- TypeScript check passes.
- Production build completed in /tmp/daybreak-audit-20260906, preserving the user's running build; wallet dependency warnings remain.
- All 13 source token symbols, token decimals (8), multipliers and feed descriptions matched the expected values at Base block 50934962. This proves those reads, not user eligibility or liquidity.
- Read-only holdings approach correctly avoids requiring Daybreak purchase history.
- No transaction-submission path was introduced by the new wallet integration; legacy live execution still fails closed.
- Sample community profiles are explicitly labeled. Sharing uses a limited room snapshot, and the existing design/motion work was left intact.

## Evidence and rerun
- `node scripts/audit-core.cjs` reproduces double scaling, failed reads returning empty, invalid fresh price and HTTP 200 outage handling. These are bug-reproduction probes, not passing acceptance tests.
- `docs/audit/onchain-metadata.json`: dated mainnet read results.
- `docs/audit/source-snapshot.json`: hashes of reviewed source files.
- Build succeeded with missing wallet SDK/optional connector warnings and a dependency-expression warning. No dependency CVE scan, penetration test, authenticated-wallet E2E or real purchase test was performed.

## Product direction and resource decisions
Keep Daybreak as the name: it matches the existing identity and the daily discovery habit. Name availability/trademark clearance was not assessed.

The core loop should be: discover a company → understand the token → follow news → connect to see existing holdings → continue to a supported buying venue → return to an updated portfolio. Circles should be optional social context, not a prerequisite to getting value.

[Base integration docs](https://docs.base.org/specifications/b20/tokenized-stocks-on-base) publish token/feed addresses and explain B20 share scaling and total-return prices. Use this plus issuer listings as reviewed registry inputs. Factory events can find candidates, but cannot by themselves certify a token as a stock.

For genuinely free news, [GDELT](https://gdeltproject.org/about.html) allows commercial dataset use with attribution. Its [DOC API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) can supply article discovery; query company names with disambiguation and display source links, not copied articles. Relevance and availability need testing.

[Marketaux](https://www.marketaux.com/pricing) is a finance-specific prototype option: 100 requests/day and 3 articles/request. Confirm public redistribution rights before launch. [Finnhub's terms](https://finnhub.io/terms-of-service) require written approval for redistribution; [NewsAPI's free plan](https://newsapi.org/pricing) is development-only. Free access is not automatically permission for a public app.

External purchase links are the first release. [0x Swap API](https://docs.0x.org/api-reference/api-overview) supports Base for a subsequent embedded route; an API key and per-token executable quote are needed. Keep eligibility handling at the venue and make the handoff explicit.

## Next build order
1. Fix wallet dependency, exact quantities/valuation, partial failures and price validity.
2. Fix async visibility, account isolation and refresh; verify with mocked errors plus one authorized read-only wallet.
3. Consolidate registry and retire misleading fixture instrument screens.
4. Add issuer/venue links, then news with caching and source attribution.
5. Build opt-in community identity and verified holdings only after the private portfolio is dependable.
