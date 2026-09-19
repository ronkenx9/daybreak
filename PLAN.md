# Daybreak — stock infrastructure foundations and Solana integration

Status: researched implementation plan, not implemented or production-verified.
Updated: 2026-09-15. Repository inspected at `8801594`; existing unrelated Muse changes remain untouched.

## 1. Decision and scope

First make Daybreak answer four questions well:

1. **Price feeds:** What is this price, how current is it, and can I act on it?
2. **Corporate actions:** What happened to the company, what changes for this exact stock token, and what changes for my position?
3. **Compliance information:** What instrument am I holding, what rights/restrictions apply, and what actions are available through this route?
4. **User analytics:** What do I own, how has its value changed, and how much of that change comes from trades, transfers, market movement or corporate actions?

Implement these foundations for the existing Base instruments and a verified Solana xStocks catalog. Preserve Daybreak's stock discovery, news and circle experience. No new branding or homepage redesign is required.

Only after these foundations pass acceptance should we add the broader COMMON, CLEAR, DEPTH and HARVEST capabilities. No deadline or build-duration estimate is used to remove required foundation work. The hackathon's examples guide the product; they are not assumed to be separately awarded categories.

Apply the [Hackathon Execution Framework](/Users/gadgetplug/brain/skills/hackathon-execution-framework.md) through its canonical path `/Users/gadgetplug/brain/skills/hackathon-execution-framework.md`: real sources, deterministic numbers, explicit unknowns and live proof. Its historical contest deadlines and project-specific rules are not current Stocklana requirements. Use unlazy gates for each implementation phase.

## 2. Current state: code audit, not marketing claims

| Area | Inspected implementation | Gap to close |
|---|---|---|
| Price reads | `lib/base/prices.ts` validates Chainlink round, description, decimals and registry pause/multiplier; block-consistent multicall | No shared issuer/chain price contract, market session, confidence or underlying-vs-token comparison |
| Freshness | `lib/base/model.ts` has one `PRICE_MAX_AGE_MS = 26 hours`; stale values can contribute to labeled reference totals | Per-feed heartbeat/session policy; separate display eligibility from executable-price eligibility; show freshness consistently |
| Holdings | `lib/base/holdings.ts` reads raw and scaled Base balances; partial reads are explicit | Snapshot type hardcodes chain 8453; cannot reuse Base valuation semantics blindly on Solana |
| Corporate actions | `lib/base/abi.ts` and stock details acknowledge multipliers; no structured corporate-action pipeline found in inspected stock/news surfaces | Event ingestion, issuer treatment, effective-time tracking, position impacts, adjusted history and corrections |
| News | `lib/news/provider.ts` currently uses Finnhub company news, relevance filtering and preserved snapshots | Brain's older GDELT note is stale; headlines are not confirmed corporate actions or causal price explanations |
| Compliance information | `components/daybreak/StockDetails.tsx` links issuer documents and verified listings | No structured, versioned per-instrument rights, restrictions, redemption conditions or action eligibility surface |
| User analytics | `components/daybreak/Portfolio.tsx` displays holdings and reference subtotal | No complete cash-flow-aware performance/cost-basis/event attribution system in inspected portfolio surface |
| Other analytics | `lib/data/pairing-opportunities.ts` ranks market/pool activity; Vercel tracks app usage; `/api/stats` counts entities | These do not replace personal investment analytics. `/api/stats` also converts query failures to zero: fix unknown-state semantics |
| Charts | `MemeChart.tsx` and `/api/memechart` provide pool OHLCV with explicit token-side selection | Need instrument-aware underlying/token charts, action markers and documented adjustment basis |
| Solana | Solana dependencies, Privy and `StonkFunLaunch.tsx` already exist; `lib/stonkfun/pairs.ts` maps display symbols | A launch integration is not Solana stock holdings/analytics support. Never use those symbol aliases as canonical mint identity |
| Eligibility | `/api/holdings/sync` calls the Base reader and wallet ownership checks | Chain-aware authenticated wallet binding and eligibility must preserve existing private binary behavior |

This is a scoped source audit. No live balances, API subscriptions, routes, funds, or production functionality were exercised during planning.

## 3. Shared foundation: company, instrument, deployment

Create `lib/instruments/` and preserve the existing Base adapter behind it.

- `Company`: stable company ID, exchange ticker/venue when applicable, optional sourced sector classification.
- `Instrument`: stable issuer ID, product ID/ISIN where supplied, referenced company, instrument type, price basis, corporate-action policy and document links.
- `Deployment`: instrument ID, chain namespace/network, exact address or mint, token program, decimals, supported extensions, verification source/time and status.
- `PriceObservation`: instrument/deployment, provider/feed ID, integer mantissa/exponent or decimal string, currency, basis (underlying share / raw token / scaled unit), event timestamp, receipt timestamp, session, confidence if supplied, stale/carried-forward state and provenance.
- `BalanceObservation`: raw integer amount, effective multiplier/scale, displayed quantity, block/slot, observed time, completeness and source.
- `CorporateAction`: provider ID/revision, company event type, announcement/ex/record/payable dates when available, issuer effective time, old/new multiplier, status, source and corrected/superseded event links.
- `InstrumentPolicy`: issuer/venue, action (view, buy, sell, transfer, redeem), applicable conditions, effective date, evidence URL, reviewed date and unknown/allowed/restricted decision.

Use company IDs for discovery and circle grouping. Use instrument + deployment IDs for balances, prices, rights and execution. A ticker never proves identity. Do not treat Coinbase tokens, xStocks and Tessera tokens as interchangeable securities.

Persist public reference tables separately from private user history. Proposed migrations: instruments/deployments, price observations, corporate actions/revisions, policy versions, opted-in portfolio snapshots, ledger transactions and analytics coverage. Apply RLS to user records. Retain binary circle eligibility without exposing portfolio size; personal analytics history requires explicit opt-in and deletion controls.

## 4. Price feeds — make every displayed price understandable

### Tasks

- [ ] P1. Audit and record each Base feed's documented units, heartbeat and multiplier treatment against current Base documentation. Existing code uses raw balances with its total-return reference; preserve only after semantic verification.
- [ ] P2. Add Pyth adapter for verified underlying equity and tokenized-asset feeds where available. Resolve feed IDs from current provider catalog, not ticker guesses. Keep absent feeds absent.
- [ ] P3. Add session-aware freshness: regular, extended, closed, holiday; distinguish last market reference from a currently executable DEX quote. A fresh transport timestamp must not refresh an old underlying value.
- [ ] P4. Display source, as-of time, session and price basis. Show stock reference and token market/quote separately. Compute premium only after aligning currency, units and time; label a comparison to a closed-market reference accordingly.
- [ ] P5. Store timestamped observations for charts. Validate decimals, positive values, future timestamps, missing confidence, provider outages and drift. Use provider-specific policies rather than a universal confidence threshold.
- [ ] P6. Separate price policies: historical/reference display can retain labeled old data; trade guards must require their declared freshness bounds. Cached demo data is labeled and cannot authorize live execution.

### Acceptance

Regular-session, overnight, weekend, holiday, carried-forward and outage cases render distinctly. A stale feed never appears live. Same economic holding values consistently before/after a scale adjustment. Partial coverage remains visible. Pyth removal of one feed does not silently erase or misprice the others. No claimed underlying price for a private company without an actual suitable source.

Resources: R1, R5–R7 below. Pyth Pro access, permitted public display/history use and exact feed coverage must be qualified before promising extended-hours functionality. Do not assume the hackathon prize grants access before judging.

## 5. Corporate actions — connect company events to token effects

### Product

Add an **Events & impact** area to the existing stock workspace, linked to the news discussion and charts. Each event has three distinct explanations:

1. **Company event:** sourced fact and dates (dividend, split, reverse split, merger, spin-off, ticker change or delisting).
2. **Token treatment:** what this issuer actually schedules/applies; pending, applied, corrected or unknown.
3. **Your position:** confirmed mechanical quantity changes and separately measured market-value movement.

News/earnings/product announcements may explain context, but are not automatically corporate actions. Show observed price changes over named windows; do not say an article caused them. An LLM may summarize sourced facts, never invent amounts, dates, entitlement or predicted price effects.

### Tasks

- [ ] C1. Ingest xStocks upcoming/history endpoints with pagination, overlap windows, idempotent upsert, revisions and cancellation handling. Keep company dates separate from token activation dates.
- [ ] C2. Persist multiplier history and compare announced treatment with observed on-chain state. For Base, use verified issuer/registry evidence; xStocks treatment does not establish Coinbase treatment.
- [ ] C3. Use official company investor-relations releases/filings for underlying confirmation. SEC EDGAR is a supplementary US filing source, not a universal corporate-action calendar. Events without supported issuer treatment display “Token treatment not confirmed.”
- [ ] C4. Implement deterministic position effects. Example fixture: 10 displayed units become 20 after a 2:1 split while a $100 reference becomes $50; nominal value stays $1,000 absent market movement. Label fixture as illustrative.
- [ ] C5. Distinguish dividend reinvestment/scale adjustment from cash received. Do not count both a dividend payout and an adjustment for the same issuer event. Never attribute an entitlement using only today's balance when event-time history is required.
- [ ] C6. Add chart event markers, upcoming-impact notices, applied-state refresh and revised-event history. Unsupported complex actions get an explicit unknown state, not guessed split math.
- [ ] C7. At multiplier activation invalidate quantities, quotes and analytics caches; preserve historical transaction units at their original block/slot. Support reprocessing when corrected data arrives.

### Acceptance

Replay a sourced historical xStocks action and compare application output with issuer history and chain evidence. Cover upcoming→effective→observed, duplicate ingestion, correction, reverse split and missing history. A split cannot create fictional profit; reinvested dividends cannot appear as cash payments. News remains independently usable when action providers fail.

Resources: R2–R4, R8. Exact xStocks timing must be taken from current event/mint data, not hardcoded from a general documentation example.

## 6. Compliance information — clear product facts and action rules

### Tasks

- [ ] L1. Build an instrument facts panel: issuer, legal product type, economic exposure, voting rights, dividend treatment, custody/backing evidence, redemption conditions, issuer/venue restrictions, source documents and last review date.
- [ ] L2. Create versioned action-specific policy records. Separate ability to hold on-chain from eligibility to purchase or redeem through a venue. Do not infer legal eligibility from a connected wallet, chain, IP address alone, or a successful quote.
- [ ] L3. Surface facts before buy/launch/reward interactions and apply verified route rules server-side. Missing required policy information yields unavailable/unknown for that action, with a reason; do not label the user globally “noncompliant.”
- [ ] L4. For xStocks, link product Final Terms and current restricted-jurisdiction information. Obtain a qualified review of Daybreak's intended distribution/execution role before claiming compliance. An information panel is not regulatory certification.
- [ ] L5. Audit data permissions: current Finnhub news entitlement, image/summary reuse, Pyth display and storage, derived paid API distribution and history access. Record provider/plan/allowed use/review date. An API key or HTTP 200 does not establish redistribution rights.
- [ ] L6. Retain only necessary policy evidence; prevent public exposure of location, verification data and private holdings. Keep actions and terms versions auditable.

### Acceptance

Two instruments referencing the same company can show different rights/treatments. Restricted and unknown action states are distinguishable. Terms updates invalidate affected decisions. Redemption conditions are not described as guaranteed permissionless liquidity. No claims that ownership of xStocks confers shareholder voting rights.

Resources: R9–R11, R1. Current jurisdiction lists and provider contracts must be reviewed; this plan makes no individualized legal eligibility finding.

## 7. Analytics — useful to Daybreak users

Prioritize investment analytics over operator telemetry. Both have explicit coverage and methodology.

### Tasks

- [ ] A1. Portfolio exposure by company, issuer and chain, current reference value, stale/unpriced amounts and upcoming actions. Do not double count the same account or conflate wrapped representations.
- [ ] A2. Build an idempotent transaction ledger with buys, sells, external transfers, fees and corporate adjustments. Classify unknown transfers as unknown; a deposit is not profit and an incoming transfer does not establish cost basis.
- [ ] A3. Add reference-value history and net contributions first; realized/unrealized P&L only where cost basis is sufficient. Document one consistent lot method (FIFO for product analytics, not tax advice). Exclude unknown-basis lots from claimed complete P&L.
- [ ] A4. Time-weighted performance requires valuations around external cash flows; show unavailable/limited coverage if missing. Separate token price return, underlying price return and total-return basis. No invented historical chart from current quotes.
- [ ] A5. Asset analytics: dated liquidity, volume, executable price impact at named sizes and normalized token/reference spread. Concentration and issuer exposure use sourced classifications; missing sectors stay unclassified.
- [ ] A6. Event attribution: show mechanical adjustment independently from market movement and user flows. Use historical multipliers, not today's multiplier on old receipts.
- [ ] A7. Provide downloadable user ledger/metric data with dates, provenance and coverage; enforce user authorization and deletion. Public circle analytics remain aggregate and privacy-preserving.
- [ ] A8. Fix `/api/stats` error-to-zero behavior; distinguish account counts from people, active memberships from unique members. Operator funnel analytics are a secondary module, not the personal analytics deliverable.

### Acceptance

Known buy/sell/fee/deposit/withdrawal/split fixtures reconcile independently. Identical economics across a split do not produce a P&L spike. Missing acquisition history displays unknown cost basis. Two users cannot access each other's histories. Duplicated ingestion and account relinking cannot inflate value. Every chart states window, source, units and coverage.

## 8. Solana integration route

**Confirmed:** xStocks is an appropriate first Solana stock provider with official public metadata and corporate-action resources. It is not the only Solana stock family. Add PreStocks/Tessera later as separate issuer adapters; do not map private products to public-equity rights or fabricate an underlying exchange quote.

### S1 — qualify exact instruments

Use the official xStocks v2 catalog; start verification with overlapping companies such as AAPL, NVDA and TSLA, expanding every instrument that passes qualification. This is verification order, not a deadline-based scope cap. Record official symbol, mint, decimals, chain, token program/extensions and legal product ID. Validate mint accounts through Solana RPC. Never trust StonkFun aliases such as APPLX as universal xStocks symbols.

### S2 — wallets and quantities

Reuse existing Privy/Solana infrastructure after reviewing `Web3Provider.tsx`, `AccountProvider.tsx`, `StonkFunLaunch.tsx` and auth-server wallet validation. Bind Solana wallets using chain-aware signed challenges and authenticated ownership checks. Preserve case-sensitive Solana addresses; do not lowercase them using EVM normalization.

Enumerate both supported token programs and all matching token accounts, not only one assumed associated account. For each mint inspect actual extensions. Distinguish integer base units, unscaled decimal quantity and scaled display amount. Solana Scaled UI Amount requires time-aware conversion; apply the multiplier exactly once. Price observations must state which quantity basis they multiply. Use exact/decimal arithmetic with explicit rounding and test against RPC/SDK conversion behavior; avoid floating-point money aggregation.

Do not apply xStocks EVM `balanceOf` semantics to Coinbase B20 or assume all Solana stocks use identical extensions. Existing Base snapshots remain supported while new shared contracts replace hardcoded chain/ticker keys.

### S3 — data integration

Implement proposed `lib/solana/{client,registry,holdings,amounts}.ts`, `lib/providers/xstocks.ts` and `lib/prices/pyth.ts`. Adapt existing prices/holdings endpoints with backwards-compatible responses or versioned routes. Store slot/block provenance; report cross-chain observation skew rather than pretending reads are globally atomic.

Provider fetches run server-side with schema validation, bounded concurrency, rate limits, timeout/backoff and original timestamps. Public reference data can be cached; personal data requires authenticated private caching. A durable scheduler ingests events/history; avoid relying on a Vercel request to maintain an indefinite websocket. Use a dedicated worker for streaming if selected; qualified HTTP snapshots are an alternative.

### S4 — eventual in-app trading

After the four foundations are verified, integrate Jupiter's current Swap API v2 `/order` + `/execute` path for ordinary wallet-signed stock swaps. Current docs supersede older Ultra v1 references in the brain. Qualify exact stock/USDC routes, authentication, fees, minimum-output semantics, extension support and token quantity units. No-route is a supported result.

Bind order to instrument, wallet, cluster, input raw amount, output bounds and expiry. Decode/simulate and inspect transaction before signing; prohibit silent wallet changes. Persist operation/signature before ambiguous retries; reconcile finalized chain balance changes and fees. Never blindly resubmit an expired or unknown-status transaction. Inspect Router `/build` only if custom instruction composition is required.

Solana mainnet stock liquidity may not exist on devnet. Use local/devnet fixtures for adverse cases, read-only mainnet evidence for actual instruments, and separately authorized real execution for end-to-end production claims. No funds or mainnet writes are authorized by this planning document.

## 9. Dependency order and release gates

| Phase | Work | Completion evidence |
|---|---|---|
| F0 | Provider qualification + canonical instrument model | Verified schema/resource access, issuer/mint mappings, units, data-use requirements recorded |
| F1 | Base audit remediation + Solana balances + price feeds | Correct balances/value, freshness/session behavior, coverage and wallet isolation |
| F2 | Corporate actions and contextual events | One sourced replay plus deterministic split/dividend/correction tests; token effects shown separately |
| F3 | Compliance information and action policies | Source-backed product facts and reviewed policy decisions for supported routes |
| F4 | Personal analytics and integrated app surfaces | Cash-flow-aware ledger, honest P&L/history, privacy tests and mobile/desktop walkthrough |
| F5 | Foundation release verification | All four questions answered in the real app for qualified Base and Solana instruments; no fabricated history/events |
| E1 | COMMON extension | Cross-chain circle eligibility built on verified ownership, not a duplicate registry |
| E2 | CLEAR extension | In-app execution checks + confirmed swap receipts using foundation data |
| E3 | DEPTH extension | Executable launch/liquidity decisions beyond descriptive foundation analytics |
| E4 | HARVEST extension | Genuine fee receipts → funded allocations → confirmed claims; no promised yield |

F3 policy/source work can be researched alongside F1/F2, but no live action skips its policy gate. All F0–F5 gates precede expansion work. There is no instruction here to spawn agents or run work in parallel.

Existing verification commands from repository root: `npm test`, `npm run type-check`, `npm run build`. Add behavior tests to the established harness or an explicitly introduced compatible runner; do not invent passing test commands before implementing them. Each phase gets its own GATES.md with exact CHECK/EXPECT and source-backed manual evidence for what automation cannot determine. Run the four passes: complete, depth, correctness/integration, polish. Test provider outages, stale data, quantity conversion and privacy, then do a real-network read walkthrough. Cache/replay mode is labeled and separate from live execution.

Preserve existing unrelated Muse edits. No deployment, new subscription purchase, bridge operation, token launch or funds movement is part of writing this plan.

## 10. Integration resource register

Checked 2026-09-15. “Docs verified” means documentation was read, not that credentials, paid entitlement, exact mint routes or production API availability passed a live test.

| ID | Primary resource | Use and qualification |
|---|---|---|
| R1 | [Base tokenized-stock integration](https://docs.base.org/build-on-base/integrate-defi/list-tokenized-stocks) | Revalidate current Base registry, oracle units and issuer integration guidance; existing source URL redirects here |
| R2 | [xStocks API v2](https://docs.xstocks.fi/apis/openapi), [Assets](https://docs.xstocks.fi/apis/openapi/assets), [OpenAPI JSON](https://docs.xstocks.fi/_bundle/apis/@v2/openapi.json?download=) | Production base `https://api.xstocks.fi/api/v2`; public endpoints documented as unauthenticated; client issuance/redemption APIs require onboarded account/API key |
| R3 | [Corporate Actions API](https://docs.xstocks.fi/apis/openapi/corporate-actions) | `GET /public/corporate-actions/history` and `/upcoming`; pagination, symbol filters and revision-safe ingestion |
| R4 | [xStocks exchange integration](https://docs.xstocks.fi/docs/exchange-integration), [dividends and splits](https://docs.xstocks.fi/docs/dividends-and-stock-splits) | Issuer treatment and chain-specific scaling; use `/public/assets/{symbol}/multiplier/history` from OpenAPI for historical units |
| R5 | [Solana Scaled UI Amount integration](https://solana.com/docs/tokens/extensions/scaled-ui-amount/integration-guide) | Display/transaction amount conversion, effective multipliers and historical handling; validate SDK compatibility with installed web3.js before copying examples |
| R6 | [Pyth Pro getting started](https://docs.pyth.network/price-feeds/pro/getting-started), [FAQ](https://docs.pyth.network/price-feeds/pro/faq) | Feed discovery/access, carried-forward timestamps, invalid-feed handling and transport behavior; credentials/plan and public display rights pending |
| R7 | [Pyth market hours](https://docs.pyth.network/price-feeds/pro/market-hours), [integration best practices](https://docs.pyth.network/price-feeds/core/best-practices) | Sessions, stale/confidence policies; Core and Pro are separate integrations and coverage must be checked |
| R8 | [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | Company filings/reference facts; use fair-access identification/rate limits, server fetches and company IR links; not a stock price API |
| R9 | [xStocks legal overview](https://docs.xstocks.fi/docs/product-legal-overview), [issuer legal documents](https://assets.backed.fi/legal-documentation) | Product rights, Final Terms and distribution conditions; record per-instrument source/version |
| R10 | [Coinbase Tokenize](https://www.coinbase.com/tokenize) | Existing Base issuer entry point; locate exact current product terms rather than importing xStocks policy |
| R11 | [Finnhub terms](https://finnhub.io/terms-of-service) | Review current news provider's commercial/display/cache/redistribution entitlement; no new paid subscription assumed |
| R12 | [Privy Solana signing](https://docs.privy.io/wallets/using-wallets/solana/sign-a-transaction) | Existing account stack's wallet signing; qualify external/embedded wallet lifecycle and actual installed SDK API |
| R13 | [Jupiter Swap v2](https://developers.jup.ag/docs/swap) | Post-foundation execution: `/order` + `/execute`; `/build` + `/submit` if composition needed; API key/rate limit/fees and route support pending |
| R14 | [Meteora documentation index](https://docs.meteora.ag/llms.txt) | Later stock-paired liquidity/DBC work; exact Token-2022 quote mint support, migration and fee modes require qualification |
| R15 | [Tessera docs](https://docs.tessera.pe), [PreStocks API](https://prestocks.com/api/prestocks) | Optional subsequent issuer adapters; Tessera legal structure differs; PreStocks endpoint supplied in brief and still needs schema/terms/live qualification |

### Exact public xStocks endpoints to qualify first

- `GET https://api.xstocks.fi/api/v2/public/assets`
- `GET https://api.xstocks.fi/api/v2/public/corporate-actions/upcoming`
- `GET https://api.xstocks.fi/api/v2/public/corporate-actions/history?page=1&pageSize=10`
- `GET https://api.xstocks.fi/api/v2/public/assets/{officialSymbol}/multiplier/history`
- `GET https://api.xstocks.fi/api/v2/public/proof-of-reserves`
- `GET https://api.xstocks.fi/api/v2/public/system/status/{officialSymbol}`

Generate request/response types from a pinned OpenAPI snapshot, verify against actual responses and inspect pagination/nullable fields. Proof-of-reserves is a dated issuer/provider observation, not an independent Daybreak audit. Do not list every instrument as tradeable because metadata exists.

### Qualification outputs required before implementation claims

Record selected RPC provider/cluster and token-program support; exact mint/feed mapping; API success/error sample with secrets removed; public display and historical storage rights; Pyth entitlement; historical coverage; issuer terms and permitted action policy; Jupiter routes and signing lifecycle. Credentials stay server-side. Unavailable providers remain explicit dependencies, with an alternative recorded where viable. No fake data may substitute for a failed production qualification.

## 11. Definition of foundation complete

A user opens a supported stock on Base or Solana, sees a correctly labeled price, understands a sourced company event and its actual token treatment, can read the instrument's rights/conditions, and sees their own holdings/analytics with truthful coverage. Refreshes, outages, corporate-action changes and wallet changes behave correctly. Desktop and mobile present the same facts.

Only then do we resume the broader community, execution, launch intelligence and rewards expansions. This plan's completion does not imply those application outcomes are already met.
