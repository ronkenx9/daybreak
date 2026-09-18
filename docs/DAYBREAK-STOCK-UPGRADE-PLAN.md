# Daybreak: stock ownership, communities, and useful action

Date: 2026-09-18
Status: Proposed implementation plan. No execution, spending, transaction signing, or new subscription is authorized by this document.

## Product contract

Daybreak is one product submitted to both Bankr and Stocklana. Their briefs inform improvements to the same experience, architecture, and roadmap. They do not create separate products or demo-only branches.

Consumer promise: **Discover companies, understand your holdings, and participate with people who share your interests.**

Core journey: discover a company → inspect its instruments and news → acquire a supported instrument → verify ownership → enter its Circle → return for relevant developments and shared research.

Priority order:
1. Company identity and cross-chain Circle eligibility.
2. A private holdings briefing connected to Circle discussions.
3. Transparent instrument selection and reviewed purchases.
4. Circle watchlists with personal allocations and reviewed purchases.

Pre-IPO companies participate in this same journey through PreStocks. Muse and community-token launches are contextual Circle tools. DBC experiments remain secondary until their benefit to stock holders is demonstrated.

Design constraints: preserve Daybreak's existing visual language, company-first discovery, compact profile dashboard, and one account. Add capabilities within company pages, Circles, and You. Avoid another top-level destination for each provider. Wallet connection remains in the sign-in/account flow; holdings surfaces can offer verification and refresh.

## Track fit and boundaries

The official Stocklana brief asks for useful stock products and names trading, investing, infrastructure, and social consumer experiences. The PreStocks bounty explicitly welcomes research, discovery, community, and investing tools. Pyth encourages data that materially informs the product. These support the upgrades below [R1].

Bankr's Runtime builder request includes portfolio intelligence, social investing, creator products, and programmable finance. The available copy is a mirror of its DevRel lead's post; the direct X page could not be retrieved. Treat it as product-direction context, not verified contest eligibility or submission rules [R2]. Bankr integration capabilities must be qualified independently against official API documentation [R3–R5].

| Opportunity | Daybreak integration | Evidence required |
|---|---|---|
| Social ownership | One company Circle accepting explicitly supported Base/Solana instruments | Verified linked wallets, expiry-aware access, instrument provenance |
| Portfolio intelligence | Holdings briefing with relevant sourced developments | Correct company matching, freshness, private account isolation |
| Pyth data | Comparable token/reference prices with session and confidence context | Real feed availability, unit normalization, stale-data handling |
| PreStocks | Complete pre-IPO company pages and holder communities | Exact supported mints, actual balances, valuation provenance |
| Bankr execution | Supported reviewed stock purchases and contextual launches | Per-user authority, provider policy checks, reconciled receipts |
| Circle investing | Versioned watchlists and user-selected allocations | Real quotes, independent confirmations, partial-failure recovery |
| Meteora DBC | Optional justified launch mechanics for Circle creators | Protocol compatibility, original useful configuration, actual pool evidence |

**Eligibility constraint:** PreStocks says projects integrating non-PreStocks pre-IPO tokens are ineligible for its bounty. Use PreStocks as the pre-IPO provider for this scope; do not add Tessera simply to collect another integration [R1]. Public-equity instruments remain a distinct category.

The Stocklana page currently has conflicting deadline text between its headline and timeline. Recheck the organizer's authoritative deadline before submission; this plan does not choose one silently. No prize or eligibility claim depends on the older local notes.

## Current foundation

Inspected repository: `dayworld`, 2026-09-18. Existing files establish reusable foundations, not proof of every production flow.

| Existing surface | Relevant files | Upgrade needed |
|---|---|---|
| Base holdings and verification | `lib/base/holdings.ts`, `app/api/holdings/sync/route.ts`, `lib/db/repo.ts` | Generalize verified eligibility beyond Base tickers |
| Solana public stocks | `lib/solana/xstocks-registry.ts`, `lib/solana/holdings.ts`, `app/api/solana/holdings/route.ts` | Bind eligible balances to authenticated linked Solana wallets |
| PreStocks | `lib/solana/prestocks-registry.ts`, `lib/solana/prestocks-holdings.ts`, `components/daybreak/PreStocksDiscovery.tsx` | Join private-company identity, news, and Circle access |
| Circles | `lib/db/circles.ts`, `lib/db/schema.ts`, `lib/db/repo.ts`, `components/daybreak/CirclesHub.tsx` | Company requirements and multi-chain evidence |
| Circle news | `app/api/circles/news/route.ts`, `components/daybreak/CircleNews.tsx` | Replace Base-ticker-only resolution with company/provider resolution |
| Discussion identity | `lib/news/url.ts`, `app/api/news/comments/route.ts` | Migrate safely from ticker to company identity without losing conversations |
| Prices and events | `lib/prices/pyth.ts`, `app/api/equity-prices`, `app/api/xstocks/corporate-actions`, `app/api/xstocks/facts` | Reuse actual feed/session/event coverage in briefing and purchase review |
| Base purchase foundation | `lib/bankr/*`, `app/api/trades/quote` | Prove per-user execution authority before enabling signing |
| Solana purchase foundation | `app/api/solana/swap-quote/route.ts`, existing Privy Solana signing | Qualify current Jupiter API, build/sign/submit/reconcile flow |
| Consumer profile | `components/daybreak/ProfileOverview.tsx`, `components/daybreak/DaybreakApp.tsx` | Add concise briefing and reconcile chain-specific portfolio totals |

Read `PLAN.md`, `docs/stocklana-foundation/STATUS.md`, `docs/BANKR-INTEGRATION-PLAN.md`, and `docs/bankr/CAPABILITY-MATRIX.md` before implementation. Preserve the root `PLAN.md`; this document specifies the product integration sequence on top of that foundation.

Two stale assumptions to recheck: finding an eligible wallet does not require scanning largest token accounts; verification reads the authenticated user's linked wallet. A funded wallet is needed for a real execution test, but funding alone does not establish that the execution implementation exists or is correct.

## Phase 0 — qualify dependencies and lock identities

Deliver an updated capability matrix with implemented, locally tested, live read verified, live transaction verified, and blocked states separately recorded.

- Inspect current migrations and wallet ownership helpers; document their EVM/Solana support.
- Resolve exact stock contract/mint identifiers from issuer registries. Never match only by token symbol.
- Revalidate Bankr auth mode, execution wallet ownership, permissions, location policy, and partner availability. A shared server API key must not become every customer's trading wallet.
- Compare the installed Jupiter adapter with current Swap API documentation. The currently documented entry point is Swap API v2; do not blindly combine an old quote format with a new transaction endpoint [R6].
- Verify available Pyth products, exact feed identifiers, timestamps, session metadata, confidence fields, credentials, and usage rights. Never assume Core and Pro share feed coverage [R7].
- Verify news display/summary rights and provider limits; public availability alone is not permission to republish full text.
- Capture required environment variable names, owner, provider limits, and fallback behavior without recording secrets.

Exit: a dependency table with an owner and actionable unblock step for every blocked capability. Read-only product work proceeds independently of transaction funding.

## Phase 1 — one company identity and cross-chain Circles

### Data model

Introduce stable `companyId` values such as `apple`, `nvidia`, and `openai`. A company can have several instruments with different rights and execution routes.

Proposed models (names are implementation targets, not existing tables):
- `companies`: ID, display name, public/private classification, vetted aliases, news-provider mapping.
- `instruments`: ID, company ID, chain namespace/ID, exact contract or mint, issuer, instrument type, decimals, scaling method, rights source, status, approved route capabilities.
- `circle_company_requirements`: circle ID, company ID, accepted instrument IDs or explicit acceptance policy, existing any/all gate semantics.
- `holding_evidence`: user ID, verified wallet binding, instrument ID, eligible boolean, observed block/slot, checked time, expiry, read status. Store no quantity or USD balance for social access.

Keep company-level access distinct from issuer rights: accepting two instruments into one Circle does not imply they are legally or economically interchangeable. Do not admit perpetuals, community tokens, LP receipts, or similarly named tokens unless a separately reviewed policy explicitly supports them.

### Verification flow

1. Authenticate the account and verify the requested wallet is linked to that account.
2. Resolve approved instruments for that chain.
3. Read balances with the existing Base/Solana readers, including supported Token-2022 scaling/extension behavior.
4. Store minimal expiring eligibility evidence, then aggregate eligible company IDs across linked wallets.
5. Evaluate any/all Circle requirements using company IDs.
6. Enforce the same policy on Circle listing, joining, members, discoveries, news, and comments.

A failed RPC read is unknown, not zero. New access requires valid evidence; existing evidence may remain valid only until its original expiry. A successful zero read revokes the applicable evidence. Refreshing one wallet must not overwrite evidence from another. Unlinking a wallet invalidates its access evidence. Expired evidence cannot be renewed by unrelated reads.

### Migration and code changes

Add an additive migration and a client-safe company registry (`lib/assets/companies.ts` proposed) plus server instrument resolution. Backfill existing ticker requirements through a vetted map; quarantine unmapped entries for review. Keep old API fields during transition, compare old/new decisions, then switch policy evaluation behind a feature flag.

Extend `app/api/holdings/sync/route.ts` with an explicit chain-aware input contract; reuse a chain-aware ownership helper instead of weakening the current check. Centralize eligibility in one repository/service function.

Upgrade `app/api/circles/news/route.ts` to resolve public company feeds and private-company feeds through company metadata. Preserve story provenance and canonical URLs. Provide a migration/alias strategy for old discussion keys: old comments stay in their original Circle and are not silently made global.

### Acceptance

- A linked supported Base Apple holding and a linked supported Solana Apple holding independently unlock the same approved Circle.
- A forged mint, arbitrary wallet, community token, or expired proof cannot unlock it.
- Any/all rules work when holdings are spread across chains.
- Zero balance, unlinking, expiry, account changes, and partial provider failure produce the specified decisions.
- PreStocks private-company news appears in the corresponding Circle without a fictitious public ticker.
- No social API leaks wallet balances or quantities; old comments and memberships remain recoverable.

## Phase 2 — “What changed in my stocks?”

Place a compact briefing below the profile overview, with at most three initial items and a reveal-all action. Each item explains the company, event, timestamp, and relevance, with a source link and an action to open the existing company/Circle context.

Examples are product scenarios, not current market assertions: an earnings announcement for a held company; a forthcoming issuer-supported split; a token/reference price difference that merits inspection.

### Pipeline

Proposed `GET /api/me/briefing`: authenticate → derive relevant company IDs → fetch shared company events/news → rank and deduplicate → personalize privately → return bounded items. Personalize from expiring company eligibility where sufficient; request private current holdings only for calculations that actually require them.

Proposed event schema: `eventId`, `companyId`, optional `instrumentId`, type, source URL/provider, published/effective/fetched timestamps, source revision, freshness state, and factual summary. Keep read/dismiss state user-scoped. Company content caches may be shared; account responses must be private/no-store.

Ranking: actionable upcoming issuer events first, then material new company developments, then qualified market observations. Avoid generating several cards for syndicated copies of one headline. AI may summarize supplied evidence with attribution; it must not invent causality or turn a headline into a trade instruction. Deterministic sourced cards must work without an LLM.

### Price comparisons

Normalize per-token versus per-share units before computing `(token price / comparable reference price - 1) × 100`. Require valid positive values, compatible currencies, bounded timestamp skew, supported multiplier handling, and source confidence checks. A quote depends on order size; label it separately from an indicative price.

Outside equity-market hours, say “versus last available equity reference,” with its timestamp. Never label a stale-reference difference an arbitrage opportunity. PreStocks mark and implied valuation are separate provider concepts, not exchange-traded spot references. Dividends and splits need issuer-specific treatment; do not manufacture cash income or double-apply a multiplier.

### Acceptance

- An account sees only relevant holdings events; switching accounts does not retain another account's briefing.
- Empty holdings, no developments, partial coverage, and source outage have distinct states.
- Duplicate news is collapsed; revised corporate actions update rather than duplicate events.
- Timestamp-skew, stale-price, wrong-unit, and missing-price fixtures cannot emit a misleading premium.
- Opening a story reaches the correct company/Circle and preserves article identity.

## Phase 3 — understandable, reviewed stock purchases

Within the existing company workspace, show supported instruments with issuer, network, instrument facts, available funding asset, and quote availability. Default to routes compatible with the user's linked wallet and available funds. Do not imply automatic bridging or select solely by ticker.

Use a common internal quote contract: company/instrument ID, chain, funding token, raw input, expected output, minimum output, decimals, fees, gas estimate, price impact when available, expiry, provider quote ID, and execution capability. A reference price is never an executable quote.

Execution sequence: choose instrument and amount → request quote → review exact asset and costs → verify signer binding → sign/execute using the qualified provider flow → persist operation identity → reconcile chain receipt and actual amounts → refresh holdings → offer eligible Circle entry.

Maintain durable operation states: draft, quoted, awaiting authorization/signature, submitted, confirmed, failed, expired, and unknown/reconciling. Save transaction identity before retryable submission when possible. Never blindly resend after a timeout. Confirmation must use chain/provider execution evidence, not HTTP success alone.

Bankr: qualify the user's execution authority and current stock policy first; if unsupported, expose a correctly bound external route with clear handoff. Solana: qualify current Jupiter order/build formats and sign with the verified user's Privy or linked wallet. Validate intended mints, amounts, recipient, chain, fees, and allowed instruction behavior; do not sign arbitrary client-provided transactions [R3–R6, R10].

Acceptance: wrong signer, changed quote, stale quote, duplicate submit, rejected signature, expired blockhash, reverted transaction, and lost network response are recoverable and never produce a fake receipt. A real transaction is a separate explicitly authorized funded acceptance test; local simulations remain labeled as simulations.

## Phase 4 — Circle watchlists and personal allocations

Start with a versioned Circle company list. A creator/editor may curate companies, rationale, sources, and optional example weights. Members can save the list and choose their own allocations. Label this as a watchlist or allocation plan; it is not a tokenized fund or pooled treasury.

Proposed tables: `circle_watchlists`, `circle_watchlist_versions`, `circle_watchlist_items`, `user_watchlist_saves`, and private `allocation_plans`. Freeze the watchlist version used in each purchase plan; later creator edits never alter a user's pending order.

Initial release supports one execution chain per purchase plan. Resolve each company to an explicitly selected supported instrument. Validate positive weights summing to 100%, amount rounding, minimum trade size, available funds, and fees. Quote all legs, disclose missing routes, and require a new review when amounts change.

Each leg has its own durable operation and receipt. Show completed, failed, and unattempted legs; never represent a partially completed sequence as atomic or automatically liquidate successful legs. A retry applies only to the intended remaining leg after reconciling prior submissions.

Recurring buys and rebalancing are later scope: require a separate user mandate, budget, supported authority, cancellation, retry limits, and activity history. Saving a watchlist is never permission to trade.

Acceptance: unauthorized editors cannot publish; removed companies stay visible in historical versions; stale edits cannot change reviewed allocations; unknown routes remain explicit; account isolation and partial execution recovery are proven. Users can save and explore the list even while execution is unavailable.

## Pre-IPO integration and creative tools

PreStocks companies use the same company identity, briefing, watchlist, and Circle interfaces. Preserve token price, mark valuation, implied valuation, quote liquidity, and issuer terms as separate fields with provenance [R8–R9]. Never imply that a company-themed token is the PreStocks instrument.

Muse remains available from a relevant article or Circle. Bankr community launches remain attached to their company/Circle and disclose the exact pairing and creator economics. Neither is required to access ordinary news or use a personal stock watchlist.

Conviction Curves require a new product gate before expansion: specify who uses the extra token, what useful action it enables, and why DBC is needed. A scaled company valuation is a curve parameter, not validated company price discovery. A server-side holder check governs the app's launch endpoint, not permissionless pool trading. PreStocks quote-mint compatibility must be verified rather than inferred. Follow Meteora's actual program/configuration constraints [R11].

## Delivery sequence and dependencies

| Milestone | Deliverable | Depends on | Can ship independently? |
|---|---|---|---|
| M0 | Updated capability matrix and stable company/instrument map | Provider/read audits | Yes |
| M1 | Cross-chain evidence and Circle access | M0, authenticated wallet binding, database migration | Yes |
| M2 | Company-routed public/private Circle news | Company map, discussion migration | Yes |
| M3 | Holdings briefing with sourced news/events | M1/M2, usable event adapters | Yes; price comparisons can remain unavailable |
| M4 | Instrument comparison and quote review | M0, verified feeds/routes | Yes; execution remains explicitly gated |
| M5 | User-controlled transaction lifecycle | M4, signer qualification, operation persistence | Per qualified chain |
| M6 | Versioned Circle watchlists | Company map, authorization | Yes, before purchasing |
| M7 | Personal allocation purchases | M5/M6, per-leg reconciliation | Yes, one chain initially |

Do not block useful news/community work on funded transaction tests. Do not call an entire phase complete because its UI renders. At each milestone record implemented, tested, deployed, and live-proven states separately.

## Release and measurement

Use focused unlazy ledgers before implementation, with behavioral acceptance tests for authorization, migration, financial units, and transaction recovery. Visual changes require desktop/mobile and light/dark inspection. Avoid source-string tests as proof that access control or execution is correct.

Release behind independent flags for cross-chain eligibility, briefing, instrument routes, and allocation execution. Use additive migrations, preserve legacy keys during backfill, and document rollback to old readers. A disabled execution flag must not hide pending submitted operations that still need reconciliation.

Operational checks: provider error rates and latency, evidence age, unsupported instruments, briefing coverage, quote failure/expiry, transaction state age, and reconciliation failures. Keep secrets, raw balances, and article bodies out of telemetry.

Product events: company opened, holdings verified, Circle unlocked/joined, briefing opened, source visited, discussion opened, watchlist saved, quote reviewed, transaction confirmed, and return visit. Measure unique users and absolute counts before interpreting rates.

Success questions:
- Does a newly verified holder enter and revisit a relevant Circle?
- Does the briefing bring existing holders back and lead to useful discussion?
- Do saved Circle lists become personally reviewed stock purchases?
- Can people understand their selected instrument and complete a purchase without support?

Track actual collected revenue and attributable costs separately. Do not equate generated volume, creator launches, or token price with product retention. No automatic fee-funded rewards or stock distributions are included in this scope.

## Resource register

Checked or identified on 2026-09-18. “Opened” means the page was retrieved during this planning pass. “Reference” means an official implementation starting point identified from existing project documentation; re-open and qualify its precise contract before coding. Resources describe capabilities, not guaranteed credentials, coverage, rights, or account eligibility.

| ID | Resource | Use and verification status |
|---|---|---|
| R1 | [Official Stocklana brief and bounties](https://hackathons.solana.com/hackathons/stocklana) | Opened. Product criteria, PreStocks exclusivity, Pyth and DBC requirements. Recheck deadline inconsistency before submitting. |
| R2 | [Bankr DevRel builder request mirror](https://twiscan.com/en/x/igoryuzo/2100040858737234210), [original post](https://x.com/igoryuzo/status/2100040858737234210) | Mirror retrieved in prior discussion; original fetch returned 403. Directional product context; verify organizer rules separately. |
| R3 | [Bankr Wallet API](https://docs.bankr.bot/wallet-api/overview/) | Opened. Direct wallet operations/auth; qualify per-user authority and write permissions. |
| R4 | [Bankr swap API](https://docs.bankr.bot/wallet-api/swap/) | Reference. Quote/execute contracts and failure semantics; reconcile with installed adapter. |
| R5 | [Bankr tokenized-stock capabilities](https://docs.bankr.bot/features/trading/tokenized-stocks/) | Retrieved in prior discussion. Venue and policy support; confirm for each selected instrument. |
| R6 | [Jupiter Swap API](https://developers.jup.ag/docs/swap) | Opened. Current v2 order/execute and build paths, API keys, transaction ownership and landing. Audit compatibility before migration. |
| R7 | [Pyth price feeds](https://docs.pyth.network/price-feeds) | Opened. Core/Pro distinctions, linked official feed-ID catalogs and API references. Verify equity/token coverage and access separately. |
| R8 | [PreStocks products](https://prestocks.com/products) | Opened. Product/instrument context; inspect exact rights and supported assets. |
| R9 | [PreStocks API](https://prestocks.com/api/prestocks) | Official endpoint linked from R1. Revalidate response schema, mints, timestamps, units, limits, and display permissions. |
| R10 | [Privy Solana transaction signing](https://docs.privy.io/wallets/using-wallets/solana/sign-a-transaction) | Opened. User signing integration; verify wallet ownership and installed SDK behavior. |
| R11 | [Meteora DBC developer guide](https://docs.meteora.ag/developer-guides/dbc), [official SDK](https://github.com/MeteoraAg/dynamic-bonding-curve-sdk) | Official links from R1. Reference for optional launch work, mint compatibility, curves and migration. |
| R12 | [xStocks API reference](https://docs.xstocks.fi/apis/openapi) | Opened. Asset identity and discovery; follow current linked specifications. |
| R13 | [xStocks corporate actions](https://docs.xstocks.fi/apis/openapi/corporate-actions), [dividends and splits](https://docs.xstocks.fi/docs/dividends-and-stock-splits) | Reference. Event revisions and issuer-specific multiplier/treatment. |
| R14 | [xStocks legal overview](https://docs.xstocks.fi/docs/product-legal-overview) | Reference. Instrument disclosures; do not inherit another issuer's rights. |
| R15 | [Base tokenized-stock integration](https://docs.base.org/build-on-base/integrate-defi/list-tokenized-stocks) | Reference. Exact supported Base assets and integration details. |

## First implementation handoff

Begin with M0 and M1. Inspect current account-wallet helpers, eligibility schema, Circle authorization, and all three instrument registries. Produce the stable company map and an additive migration proposal, then implement wallet-scoped evidence and company-scoped policy tests. Next wire both public and private company news into the same Circle context. Preserve all unrelated working-tree changes and existing user data. Reconfirm provider contracts where this register marks them as references.
