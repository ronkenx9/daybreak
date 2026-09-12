# Daybreak changes review — 12 September 2026

## Verdict and scope

The changes make the product more coherent, but the new creation and Solana launch paths are not ready for an unrestricted production release. Review only: no application code changed, no payments, launches, migrations, or authenticated user writes performed.

Reviewed Daybreak through `9c6b2c7`, including changes since `151c38c`, and the local Muse integration at `bf071d8`. Daybreak's working tree was clean and a fresh GitHub fetch confirmed HEAD equals origin/main (0 ahead, 0 behind). Muse's local checkout is clean; its remote refresh failed in the sandbox, so its deployment/revision is not established here.

## Verification

| Check | Result |
|---|---|
| `npm run type-check` | Pass |
| `npm run build` | Pass; optional Farcaster Solana module and viem/Tempo warnings remain |
| `npm test` | FAIL after 11 passing groups: `TypeError: news.normalizeArticles is not a function`, scripts/audit-core.cjs:18 |
| Production `/api/news/feed` | HTTP 200; 18 items, 17 unique URLs, six ticker families in the sampled response; stale=false |
| Production `/api/news?ticker=AAPL` | HTTP 200 with articles |
| Production article preview | HTTP 200 with actual publisher summary and image |
| Production `/api/bankr/capabilities` | configured=true, quoting=true, launches=true, trading=false |
| Production `/api/muse/spotlight` | HTTP 200, communities=[]; empty data does not prove a paid generation succeeded |
| Production `/app/launch`, `/app/profile` | HTTP 200; removed preference labels absent from profile HTML |
| Company-news outage reproduction | Mocked upstream rejection with a saved snapshot available: rejection propagates, snapshot reads=0 |

Production checks used https://www.daybreakcircles.lol. These establish endpoint availability, not complete authenticated browser/wallet workflows or an exact production commit. No full authenticated creation, launch, or fee claim was tested.

## Release findings

### 1. P1 — Fresh free pulls cannot acquire the Muse execution lock

Evidence: Daybreak `components/daybreak/MuseCreate.tsx:48` sends a new free forge without requesting a quote. Muse `app/api/integrations/daybreak/route.ts:62–64` skips settlement but always calls `claimExecution`. That helper (`lib/integrations/daybreak-payments.ts:73`) only updates an existing `muse_daybreak_payments` row. The row is created by `quotePayment`, which this path never calls. A fresh free request therefore gets a 409 before reaching image generation.

There is a second obstacle: the underlying Capsule forge still reserves the configured credit charge (`muse-mirror/app/api/capsules/[id]/forge/route.ts:160`). Skipping settlement alone does not sponsor those credits.

Fix: give all jobs a durable execution record independent of payment; create an explicitly sponsored, idempotent free entitlement that the credit reservation understands. Verify a zero-balance user gets one image without a wallet payment, and concurrent requests/retries cannot grant another free image.

### 2. P1 — Every free-pull error becomes a paid attempt

Evidence: `components/daybreak/MuseCreate.tsx:48` catches every error from the free forge and immediately calls `pay`. This includes network loss after server acceptance, provider errors, auth errors, and the lock failure above. The user can click “Free pull” and receive a payment prompt; a lost response can trigger payment while the free job is unresolved. Wallet approval is still required; this is not an automatic debit.

Fix: retain and reconcile the original job on uncertain responses. Only offer a separate paid action after a definite free-entitlement rejection and a visible user choice. Do not treat generic errors as a payment requirement.

### 3. P1 — Free eligibility can change when retrying an existing paid job

Evidence: `app/api/muse/[...path]/route.ts:36–47` skips the daily claim whenever *any* prior job exists. It does not require `prior.free === true`. The fingerprint excludes the free flag, and a failed paid job can be retried with the same fingerprint and `freePull:true`, which is then forwarded as trusted service authorization to Muse.

Fix: bind free/paid entitlement to the stored job and daily claim ID at creation; retries must reuse it, never derive it from request input. Make entitlement claim and job creation atomic. Test failed-paid→free retries, changed flags, and concurrent same-ID requests. The current broken free execution path does not make this a safe entitlement design.

### 4. P1 — Solana launch recovery returns an uncertain transaction to “Sign & launch”

Evidence: `components/daybreak/StonkFunLaunch.tsx:67–81`. Submission and polling share one catch; any failure resets to ready. The returned payment signature is not persisted. `lib/stonkfun/client.ts:pollLaunch` has no cancellation/recovery model; a single network failure exits the loop. Reloading or switching tabs loses the operation.

Impact: a payment can have landed while the UI presents a new signing/retry path, and a reload permits a fresh prepare. Resubmitting identical signed bytes is not itself a second transfer, but this flow cannot establish whether a fresh launch/payment is safe.

Fix: persist the operation and signed-transaction signature before submission; separate rejected-before-submit from submitted/unknown/processing/completed. After uncertainty, reconcile by signature and never offer fresh payment until conclusively resolved. Add reload and timeout recovery tests before a real-funds launch.

### 5. P1 — Solana inputs can diverge from the prepared launch

Evidence: `StonkFunLaunch.tsx` keeps name, symbol, description, fee mode and dev-buy inputs editable after `setPrepared`, while signing uses the old `prepared.paymentTransaction` and `signedQuote`. Success text reads the current editable name/symbol. A user can prepare one token, change the form, and sign the previous token while seeing the changed name.

Fix: invalidate prepared state on every intent or wallet change, and display an immutable confirmation snapshot of the actual quote. Bind the creator wallet through signing. Description is currently required in the form but never sent to `prepareLaunch`; resolve that field's supported metadata destination or remove the requirement. Artwork fetch errors are silently swallowed, so explicitly disclose missing artwork before signing.

### 6. P1 — Banner payment recovery loses output identity on confirmation timeout

Evidence: `MuseCreate.tsx:40` saves payment recovery before waiting for confirmations, but omits `ckind`, `pullGroup`, and `lane`. The richer session record is only written after `pay` returns (`:48`). If confirmation times out or the tab reloads first, `recover` defaults missing `ckind` to `pfp`.

Impact: a paid banner can be recorded/reopened as a PFP with the wrong output relationship. Its prompt remains banner-like, but the stored job type and UI recovery are wrong.

Fix: persist the complete immutable job input before requesting the wallet signature, then append the transaction hash. Recovery must never guess kind or parent. Prefer server-backed recovery over a single per-user sessionStorage slot that can be overwritten by another purchase.

### 7. P1 — Company-news stale fallback misses actual provider failures

Evidence: `lib/news/provider.ts:70` awaits `fetchSymbolNews` outside a try/catch; only an empty successful response reaches `loadSnapshot`. Timeouts, 429/500 responses and missing configuration throw past the fallback. Reproduced with an upstream rejection and a mock snapshot: snapshot reads remained zero.

Fix: on upstream failure or empty data, attempt the saved snapshot, preserving its original fetched timestamp and explicit stale state. The global feed also republishes in-memory older items as stale=false and updates snapshot age without proving a fresh fetch (`:99–109`); distinguish last attempt from last successful refresh. Bound the route's `lastGood` fallback age.

### 8. P2 — Regression suite still targets the removed GDELT API

Evidence: `scripts/audit-core.cjs:18` and `:22` call removed `normalizeArticles`. The suite stops early, leaving later account, provider, and import checks unexecuted. A passing type-check/build is not a substitute.

Fix: test Finnhub normalization through the current provider interface, including URL sanitation, timestamps, duplicates, outage snapshots and company coverage. Add meaningful tests for the new entitlement and transaction-recovery boundaries rather than simply deleting the old checks.

### 9. P2 — Circle news can be starved by cold starts and masks failures as empty news

Evidence: `lib/news/provider.ts:84–94` refreshes only six symbols from an in-memory cursor. A cold instance always starts at NVDA/TSLA/COIN/MSTR/CRCL/META. When any of those succeed, the persisted feed is not merged back. The sampled production response contained precisely that half of the universe, with no AAPL/AMZN/GOOGL/MSFT/INTC/SNDK entries.

`CircleNews.tsx` filters this partial feed and shows “No fresh stories” even when the request errored. Also, the “URL-keyed shared threads” comment is broader than reality: `lib/news/url.ts:articleIdentity` hashes ticker plus URL, so one article assigned to two tickers has two discussions. Production had 18 entries but 17 unique URLs.

Fix: merge saved per-company results or refresh a complete bounded universe independent of instance lifetime; show error and stale states. Decide whether threads are per article or per article-and-stock and implement that consistently. Finnhub's company assignment is not proof of headline relevance: the live NVDA set included a Monster Beverage headline, so avoid presenting every associated article as a direct company event.

## What is actually wired versus still incomplete

| Feature | Assessment |
|---|---|
| Profile cleanup | Delivered: the three requested toggles are removed; keep OS reduced-motion support |
| News feed / publisher preview | Live responses verified; outage handling and coverage issues above remain |
| Circle news/discussion | Reuses existing backend; shared for same ticker+URL; authenticated posting not retested |
| Historical moments | Real curated inputs in source, distinctly labeled throwbacks; not live market intelligence |
| Agent-written moments | Code exists in both repos with HMAC authorization; provider/deployment/user flow not proven in this review |
| PFP/banner/history | UI, durable job columns and endpoints exist; recovery and free entitlement block release confidence |
| Solana wallets / StonkFun | Implemented in source and selectable; no completed launch proof in this review; recovery defects block real-funds endorsement |
| Bankr Base launch | Capability enabled in production; prior simulation evidence is not a fresh completed launch |
| In-app stock trade | Still quote-only: production says trading=false; TradeSheet still disables execution |
| In-app LP deposit | Still disabled in StockLiquidity; pool discovery and a review form do not establish signing |
| Own openlaunch route | Builder library only; not selectable in LaunchPortal and not an end-to-end deployed launcher |
| Supabase migrations | New migration files exist, but no production schema inspection performed here. db:verify still checks only the older 18 tables |

## Specific credit for the improvements

- The product loop is more understandable: a stock story or cultural moment can lead to artwork and then a token launch.
- Moving away from the failing GDELT feed has visibly restored production news and publisher previews.
- Persistent snapshots are the right foundation for a serverless deployment; the error branch needs finishing.
- Historical and AI-written moments have distinct labels, which helps users understand their provenance.
- New tables enable RLS and revoke direct anon/authenticated access; writes remain behind server authorization.
- You removed the requested profile controls and added actual Solana wallet functionality rather than only a launch-tab mockup.
- The new dependency pin gets a production build through. The remaining optional-module warnings should be tracked, not confused with build failure.

## Recommended order

1. Repair free entitlement, payment fallback and complete recovery records across both repositories. Test zero-credit users and lost responses.
2. Gate StonkFun signing until immutable review and persisted signature recovery work; then perform a deliberately authorized small live launch.
3. Fix news failure fallback, cold-start coverage and circle error states; update the broken regression suite.
4. Verify migrations and both deployed revisions, then run an authenticated end-to-end journey from moment through generation and download.
5. Close the existing stock-trade and LP signing gaps, or describe those surfaces explicitly as quote/research tools.
6. Resume additional launcher/contract work after this path holds up. Reuse of audited components is useful, but it does not establish the correctness of our price conversion, wallet binding or transaction orchestration.

## Secondary follow-ups

- The build reports roughly 924 kB first-load JS on every app route. Lazy-load Solana/launch and creation code before adding more global SDKs.
- Review openlaunch sizing against the exact factory: the helper documents token-per-quote raw price but multiplies quote-per-token input by the decimal factor without inversion; its round-trip helper alone cannot prove correctness. It also checks int24 bounds rather than the actual pool tick range and converts supply through floating-point arithmetic. Keep it out of signing until independently verified with contract fixtures and exact units.
- Bind explicit EVM and Solana wallet identities by chain. The generic profile wallet selection takes the first wallet-like linked account, which becomes fragile now that both chains exist.
- Validate news distribution rights for the chosen Finnhub plan before treating the public feed as commercially licensed; this review did not inspect the subscribed plan or terms.
- The earlier STOCKLANA/OKX competitive-research request is separate from this code audit. No novelty or hackathon-eligibility claims are made here.
