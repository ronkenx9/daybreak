# Daybreak × Bankr integration plan

Status: approved product direction; implementation plan, not a claim of shipped integration.
Owner: Daybreak. Updated: 2026-09-06.
Provider spelling: Bankr.

## 1. Objective and product contract

Integrate Bankr into Daybreak as execution and token-launch infrastructure beneath the existing circle-first discovery experience. Extend the discovery work already underway rather than replacing it. Users discover companies, stock-paired community tokens, news and people through broader-interest circles; they can then trade supported assets or launch a community token from the relevant context.

Deliver four capabilities:
1. Verified stock-paired token discovery, attached to existing company pages and circles.
2. Native quote, review and execution flows with an explicitly identified signing wallet.
3. Community token creation with stock pairing, launch simulation, fee disclosure and confirmed results.
4. Source-backed circle research and opt-in notifications; optional paid research later.

Keep the current Daybreak visual system: electric blue, white, liquid glass and plush characters. Reuse existing sheets, stock details, profile and circle layouts. Discovery and circle membership must remain usable without a funded wallet. A community token is distinct from the company equity; meme media is also distinct from a tradable meme token.

## 2. Current foundation

- Next.js App Router, React, TypeScript; product components in `components/daybreak`.
- Privy client login and server bearer-token verification; Postgres through Drizzle; React Query client state.
- Account profiles, bookmarks and circle membership have backend implementation. Hosted authentication round-trip acceptance remains outstanding; see `ACCOUNTS-MILESTONE-1.md`.
- Reviewed Base stock registry and read-only holdings; exact token addresses and bigint valuation already exist.
- GDELT company news and Dexscreener related-token discovery already exist. Keep and extend these adapters.
- External Uniswap purchase handoff remains the fallback during native execution rollout.
- Six character looks, globe and editorial art already provide the brand foundation.

## 3. Verified provider findings and qualification register

Sources were read on 2026-09-06. Recheck before implementation because provider behavior and fee schedules change.

| Topic | Finding | Implementation consequence |
| --- | --- | --- |
| Launch API | `POST /token-launches/deploy`; user-key and partner-key paths; `simulateOnly` supported | Build simulation before broadcasting; explicitly set Base |
| Chain | API defaults to Robinhood Chain when omitted | Always send `chain: "base"`; verify receipt chain ID 8453 |
| Supply | Standard launch 100 billion; 85% pool and 15% creator vesting over one year, with 30-day cliff; optional no vesting | Display actual selected allocation; do not invent custom schedules |
| Partner allocation | Partner/org launch uses 100% pool, no creator vesting | UI derives options from integration mode |
| Fees | Current new-launch documentation states 1.75% all-in; creator receives 0.665% of trading volume | Do not present 0.7% as total cost; show actual route/launch breakdown |
| Historical fees | Launch schedules can differ by generation | Store launch metadata and version; do not apply new schedules retroactively |
| Stock pairing | Deploy documentation references `pairedStockAddress` | Verify allowed stock addresses and availability for selected auth mode before enabling each asset |
| Quote assets | `pairedTokenAddress` and `pairedStockAddress` are mutually exclusive | Validate server-side; never substitute a generic quote asset silently |
| Launch limits | Wallet and partner constraints apply; retail eligibility includes wallet age and balance | Preflight and surface structured eligibility/quota errors |
| Swap | `POST /wallet/swap-quote`, then `/wallet/swap` | Treat quote and execution as distinct operations |
| Stock eligibility | Stock execution requires passed location check; quotes can succeed without it | Successful quote must not be treated as execution clearance |
| Wallet authority | Bankr Wallet API operates on the wallet associated with its credentials | Existing Daybreak Privy login does not imply Bankr signing authority |
| Slippage | Quote and execution behavior can differ by routing path | Explicit tolerance; qualify actual route behavior; never rely on provider default |

Unresolved items become Phase 0 outputs, not assumed capabilities: supported B20 list; partner stock-pair availability; external Privy wallet transaction construction; exact per-user Bankr authorization; partner fee split configuration; webhook signing/retry contract; stock-route liquidity and eligibility UX.

## 4. Architecture

```text
Daybreak pages / existing sheets
  ├─ React Query: discovery, quotes, operation status
  ├─ Privy: app identity and explicitly selected wallet
  └─ Next.js authenticated API boundary
       ├─ existing company registry + GDELT + Dexscreener
       ├─ Bankr adapter: discovery / quote / execute / simulate / launch
       ├─ market normalization + exact-address verification
       ├─ operation ledger + authorization + reconciliation
       └─ Postgres + durable background worker
            ├─ launch and transaction state
            ├─ source-backed research jobs
            └─ opt-in notifications
```

Bankr secrets remain server-side. Never expose an organization key to the browser or accept an arbitrary user ID, fee recipient, calldata destination or wallet association as trusted client input. Reuse `requireUser` and derive internal ownership from the verified identity.

### Wallet integration decision

Prove and select one supported mode before execution code ships:

- **Existing user-controlled wallet:** use a documented transaction-building route compatible with the selected Privy/external signer, if Bankr supplies it. Validate chain, target, spender, value, recipient and token amounts before explicit user signing. Do not assume the Wallet API returns unsigned calldata.
- **Bankr-associated user wallet:** explicitly link/provision the supported per-user wallet through Bankr's documented flow. Explain which wallet holds funds. Keep it distinct from previously connected holdings wallets. Validate credentials belong to that user before any operation.

A shared Daybreak API key must never act as an implicit pooled customer trading wallet. If only the second mode is supported, implement it transparently and keep external handoff available for other wallets. Keep app identity and holdings sources separate.

## 5. Proposed modules and endpoints

These are Daybreak endpoint designs, not claims about Bankr's API shape.

| Module | Responsibility |
| --- | --- |
| `lib/bankr/client.ts` | Auth headers, bounded timeouts, structured errors, redaction |
| `lib/bankr/capabilities.ts` | Supported chain, wallet mode, stock allowlist, launch capabilities |
| `lib/bankr/discovery.ts` | Normalize launches and pair metadata |
| `lib/bankr/quotes.ts` | Quote normalization, expiry and route checks |
| `lib/bankr/operations.ts` | Durable state transitions and reconciliation |
| `lib/bankr/launches.ts` | Validated simulation and deployment requests |
| `lib/bankr/fees.ts` | Creator/partner fee reporting and provenance |
| `lib/research/` | Source collection, grounded summaries and scheduled jobs |

Proposed routes:
- `GET /api/community-tokens?companyId=...`: verified pairs, source and freshness.
- `GET /api/bankr/capabilities`: public capability flags; no secrets.
- `POST /api/trades/quote`: authenticated quote for selected wallet and allowlisted assets.
- `POST /api/trades`: explicit execution of a reviewed intent.
- `GET /api/operations/:id`: owner-authorized status.
- `POST /api/token-launches/simulate`: validated launch preview.
- `POST /api/token-launches`: explicitly confirmed launch intent.
- `GET /api/token-launches/:id`: normalized launch details and status.
- `GET /api/token-launches/:id/fees`: attributed fee reporting.
- `POST /api/integrations/bankr/webhook`: only after signature/replay contract is verified.

Use a durable worker for slow tasks; do not hold an HTTP request open for long-running provider jobs. Read retries use bounded backoff. Never blindly retry a broadcast after timeout: reconcile the operation first.

## 6. Persistence

Add migrations without replacing existing accounts or circle tables.

| Table | Important fields / constraints |
| --- | --- |
| `wallet_connections` | user ID, provider, chain, address, provider wallet reference, verification time; unique verified provider binding |
| `community_tokens` | chain, address, stock address, company ID, circle ID, source, verification status; unique chain/address |
| `token_pools` | protocol, pool ID/address, both token addresses, liquidity observation, observed time; unique chain/protocol/pool |
| `trade_quotes` | user/wallet, raw sell/buy amounts as decimal strings, decimals, minimum output, fees, expiry, provider reference |
| `operations` | user, kind, idempotency key, intent hash, status, provider reference, tx hash, error class, timestamps |
| `token_launches` | operation, creator, circle, quote asset, supply/allocation, fee recipients, simulation fingerprint, token/pool result |
| `fee_observations` | launch, recipient, raw amount, asset, claimed/claimable, source time |
| `research_digests` | circle, source references, observation window, content, model/version, generated time |
| `notification_preferences` | user, channel binding, topic, frequency, consent and unsubscribe state |

Financial amounts use raw integer strings/numeric columns and explicit decimals, never floating-point storage. Persist only necessary provider metadata; redact credentials and avoid retaining full signed payloads. An idempotency key is unique per user/action and binds to an immutable request fingerprint.

## 7. Delivery phases and acceptance gates

### Phase 0 — Provider and wallet proof

1. Read current API schemas and obtain the intended Bankr user/partner integration configuration.
2. Record exact auth mode, wallet ownership, stock support and fee schedule in a capability matrix.
3. Verify one known B20 stock by its registry address; inspect paired-launch and swap support separately.
4. Run a non-broadcast launch simulation for a permitted stock. Record allocation, predicted address and fee distribution.
5. Obtain a quote for one supported stock route; establish the execution eligibility flow separately.
6. Prove whether our selected existing Privy wallet can sign or whether explicit Bankr wallet linking is required.

**Done:** reproducible sanitized fixtures, source links, supported-wallet decision and per-stock capability flags. No fabricated success if credentials or stock availability are absent. Unknown capabilities remain disabled while independent work proceeds.

### Phase 1 — Extend active discovery

1. Reuse current company registry and Dexscreener work.
2. Add Bankr launch ingestion and optional GeckoTerminal enrichment through server adapters.
3. Match both pool token addresses against the reviewed B20 address; verify chain and provenance. Textual company references alone do not establish a stock pair.
4. Represent `verified pair`, `unverified reference`, `unavailable`, `stale`, and `provider error` distinctly.
5. Add community-token cards within company/circle context, including quote asset, source, observation time and available liquidity/volume.
6. Keep existing stock holdings valuation isolated from unrelated meme tokens.

**Done:** spoofed tickers and wrong-chain pairs are rejected; valid exact pairs display; rate limits do not become false zero activity; no duplicate discovery subsystem.

### Phase 2 — Native trading

Flow: choose asset → choose wallet → enter amount → eligibility → quote → review → explicit confirmation/signing → pending → confirmed/failed.

- Show selected wallet, exact assets, network, minimum received, all disclosed fees, price impact, tolerance and quote freshness.
- Bind review to wallet, amount and route; changes invalidate prior confirmation.
- Model `draft`, `quoted`, `awaiting_confirmation`, `submitted`, `confirmed`, `failed`, `unknown` states. An API response is not itself on-chain confirmation.
- Handle rejection, insufficient balance/gas, no route, provider denial, expired quote, account switch, refresh and delayed receipt.
- Reconcile provider operation and on-chain receipt before success; refresh holdings only with actual results.
- Keep external purchase links for unsupported assets/wallets and outages.

**Done:** quote-only tests, wallet/provider integration tests, and a separately authorized limited live transaction prove correct wallet, token, amounts and receipt. No automatic trading by research characters.

### Phase 3 — Community token launcher

Entry: company page or circle → Launch community token.

1. Require signed-in creator and appropriate circle role.
2. Capture name, symbol, artwork and description; label independence from the company.
3. Select only currently supported stock quote assets. Default from company context, but validate against server capabilities.
4. Display actual supply, allocation, cliff/vesting where applicable, fee beneficiaries and full fee mechanics.
5. Set creator and Daybreak revenue recipients through validated configuration; never silently redirect creator fees.
6. Simulate; bind preview to immutable intent. Changing metadata, recipients or quote asset requires another preview.
7. Explicit launch confirmation; durable operation record; no duplicate deployment on refresh or retry.
8. Reconcile confirmed deployment and verify token, pool, quote asset and recipients before publishing to discovery.
9. Index fee observations; provide creator reporting. Add fee claiming only through a separately reviewed signer flow.

**Done:** launch simulation and confirmed authorized launch match the preview; quotas surface clearly; unsupported pairs cannot submit; wrong-recipient and duplicate attempts are blocked.

### Phase 4 — Circle intelligence and notifications

Use characters as presentation personas for grounded research: company news, verified pool activity and watchlist changes. Each digest includes source links, observation time and separation between facts and interpretation. Holder concentration needs a qualified indexer; do not infer it from Dexscreener volume.

Research runs in isolated read-only jobs without transaction authority. Treat news, token descriptions and social content as untrusted input. Store provenance and make summaries reproducible. Do not invent sentiment scores without an actual methodology and data source.

Add in-app digests first. Telegram/social delivery follows verified channel linking, explicit opt-in, deduplication, frequency controls and unsubscribe. Qualify Bankr webhook/event support; otherwise use Daybreak's worker and channel integration. No assumption that Bankr offers a ready-made watchlist notification trigger.

**Done:** source-grounded digest, no secret/private portfolio leakage, and notifications delivered only to authorized opted-in recipients.

### Phase 5 — Revenue and x402

Integrate fee sharing only after partner terms and actual fee distributions are verified. Store effective launch economics instead of hardcoding creator revenue as app revenue. Show creator and Daybreak shares separately; report accrued versus claimed amounts separately.

Evaluate x402 for a paid research endpoint or agent-consumable feed. Keep ordinary discovery and circle creation accessible. Define product price, payment asset/network, verification, settlement, retries and duplicate-payment handling before charging. x402 is payment infrastructure, not automatic authorization to spend user funds. No paid provider calls or live charges are part of this planning document.

**Done:** sandbox/test payment flow and accounting reconcile before explicitly approved paid rollout.

## 8. Test and release harness

- Adapter contract fixtures: success, malformed response, timeout, 401/403, 429, 5xx; no credentials in snapshots.
- Discovery: exact pair match, reversed token ordering, spoofed ticker, duplicate pool, wrong network, stale liquidity and absent data.
- Authorization: user A cannot read or execute user B's operation; server derives wallet binding; account switch invalidates quote.
- Money: decimals, dust, large quantities, fee display, minimum output, expired quotes and mismatched units.
- Execution: double-click, network loss after submission, rejected signature, replacement/delayed receipt, reverted transaction and reconciliation after restart.
- Launch: simulation-only makes no broadcast; unsupported quote assets, changed preview, invalid recipient, quota exhaustion and duplicate intent.
- Research: source attribution, malicious source instructions, private watchlist isolation and notification consent.
- Run existing `npm test`, `npm run type-check`, and production build. Avoid competing dev/build processes sharing `.next`.
- Visual acceptance: mobile 390px and desktop; accessible dialogs, keyboard focus, readable review surfaces and reduced motion.

Feature flags proposed: `bankrDiscovery`, `bankrTrading`, `bankrLaunches`, `circleResearch`, `paidResearch`. Roll out independently. Disabling execution stops new intents while reconciliation continues for submitted transactions. Never delete pending operations to roll back a release.

Observe provider latency/errors, quote expiry, failed eligibility, submission/confirmation rate, reconciliation backlog, duplicate intent suppression and discovery freshness. Product success measures are useful saves, circle participation and repeat discovery, not incentivized trading volume.

## 9. Implementation work packages

| Package | Dependencies | Reviewable output |
| --- | --- | --- |
| A: capability proof | Bankr configuration | Verified API/stock/wallet matrix and sanitized fixtures |
| B: adapter and schema | A contracts | Typed adapter, migrations, authorization and operation ledger |
| C: discovery extension | Existing registry + B reads | Exact-pair company/circle cards and provenance tests |
| D: trading | A wallet proof + B | Quote/review/status UI, execution adapter and receipt reconciliation |
| E: launcher | A stock/partner proof + B | Simulation/review/launch UI and indexed confirmed result |
| F: research | C + worker | Grounded digest and opt-in delivery |
| G: monetization | E/F + verified economics | Fee reporting, optional x402 payment flow |

Each implementation handoff must include changed files, schema migration instructions, environment names without values, test results, verified provider behavior and unresolved external prerequisites. Do not mark a package complete because a mock interface renders.

## 10. Resources

### Aerodrome stock LP module

Daybreak now has a read-only stock LP surface for the four markets supported by Bankr's `aero-stock-lp` skill: AAPL, NVDA, GOOGL and META. The Earn tab reads the exact Aerodrome Slipstream pool on Base, shows live pool liquidity and 24-hour volume, and detects both staked gauge positions and unstaked Slipstream NFT positions for the connected wallet. It labels the earning route accurately: staked positions receive AERO emissions; unstaked positions receive pool trading fees; an out-of-range position earns neither until price returns to its range.

The implementation was independently written from the on-chain interfaces and verified facts because no repository license was present when reviewed. Do not copy or redistribute upstream skill files until the license is clarified. The upstream skill was pinned at commit `179c4c8f64c38844544cb51b68fe073e807a782e`; its live self-test passed all 59 checks on Base on 2026-09-07.

Current execution is a deliberate Bankr handoff: Daybreak creates a precise `aero-stock-lp` prompt, the user copies it, and Bankr performs its price, volatility, balance, gas and pool checks before asking for confirmation. No transaction is triggered by copying. The Bankr wallet selected during execution may differ from the wallet connected to Daybreak for holdings discovery.

Native execution remains gated on a per-user authorization design. A normal `bk_usr_...` API key controls its selected Bankr wallet and must never be used as a shared public trading credential. Direct execution requires a documented Bankr partner/provisioning flow or another verified per-user signer path. When that is available, keep the upstream sequence: obtain a fresh equity quote and volatility input; fail closed on stale or missing data; preflight balances and gas; build the deterministic plan; submit transactions sequentially; verify every receipt; size after swaps; mint the position; settle; optionally stake; and persist the resulting token ID and receipts in Postgres. Never store the upstream skill's local `~/.aero-stock-lp/state.json` as multi-user application state.

- Upstream skill: https://github.com/BankrBot/skills/tree/main/aero-stock-lp
- Base pool reads: `app/api/lp/route.ts`, `lib/base/lp.ts`, `lib/base/lp-model.ts`
- Product surface: `components/daybreak/StockLiquidity.tsx`

### Bankr — verified documentation used in this plan
- Platform: https://bankr.bot
- Documentation: https://docs.bankr.bot/
- Launch mechanics: https://docs.bankr.bot/token-launching/overview/
- Deploy API: https://docs.bankr.bot/token-launching/api-reference/deploy-token-launch/
- Wallet API: https://docs.bankr.bot/wallet-api/overview/
- Swap API: https://docs.bankr.bot/wallet-api/swap/
- Agent API: https://docs.bankr.bot/agent-api/overview/
- x402 Cloud: https://docs.bankr.bot/x402-cloud/overview/
- API base: https://api.bankr.bot
- User-supplied x402 host: https://x402.bankr.bot — direct fetch was unavailable during research; use documented Cloud integration and verify endpoint contract before coding.

### Market and wallet resources supplied for implementation
- GeckoTerminal: https://www.geckoterminal.com/dex-api
- Exact token pools: `GET https://api.geckoterminal.com/api/v2/networks/base/tokens/{token_address}/pools`
- Pool search: `GET https://api.geckoterminal.com/api/v2/search/pools?query={ticker}&network=base`
- Dexscreener reference: https://docs.dexscreener.com/api/reference
- Token lookup: `GET https://api.dexscreener.com/latest/dex/tokens/{token_addresses}`
- Search: `GET https://api.dexscreener.com/latest/dex/search?q={query}`
- Base explorer: https://basescan.org
- Privy: https://docs.privy.io
- Uniswap v4: https://docs.uniswap.org/contracts/v4/overview
- Aerodrome: https://docs.aerodrome.finance — separate protocol; not the Uniswap v4 specification.

Market endpoint schemas, limits and redistribution terms must be checked when their adapters are implemented. Search results are candidates; exact chain/address verification establishes a pair.

### Related Daybreak documents
- [Account implementation](ACCOUNTS-MILESTONE-1.md)
- [Account architecture](ACCOUNT-AND-LOGIN-PLAN.md)
- [Future product plans](FUTURE-PLANS.md)
- [Core remediation](audit/DAYBREAK-FIXES-2026-09-06.md)

## 11. Immediate implementation order

Begin A and B: qualify Bankr wallet/stock support, then add the typed server adapter and durable operation schema. Connect C to discovery already under development. Proceed with D and E using the verified integration mode; source credentials through environment configuration, never chat or committed files. Finish with grounded research and optional monetization. This is the committed integration direction; qualification determines the exact supported implementation, not whether Daybreak intends to integrate Bankr.
