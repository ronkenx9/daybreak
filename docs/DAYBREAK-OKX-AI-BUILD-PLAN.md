# Daybreak on OKX AI: implementation plan

Date: 2026-09-21
Status: planned, not implemented or registered by this document
Primary submission track: Build a Company
Product: Daybreak market data and participation, available through OKX AI

## 1. What we are building

Let someone ask an agent about tokenized stocks, discover Daybreak communities and conviction markets, and take a supported action without learning our API. Other agents should also be able to consume our structured stock-token data directly.

This is another way to use Daybreak. The website, mobile app and OKX experience use the same instruments, public markets, actor identities, policies and transaction receipts. Discovery and the social layer remain central: users can move from a company to its news, Circle and competing theses, then decide whether to participate.

Example journey:

> “Show me NVIDIA stock tokens and what people on Daybreak are backing.”
>
> The agent returns identified instruments, timestamped prices, sourced news and public theses with Daybreak links.
>
> “Create a public paper thesis that AI infrastructure spending stays strong.”
>
> The agent collects the required fields, connects the user's Daybreak actor and prepares the publication. Once authorized, it creates the real public paper market and returns its link.
>
> Another connected participant asks to Back it, reviews a paper quote, and receives a persisted trade receipt.

Live execution follows the actual supported routes. Buying a stock token and Backing a thesis token are different actions and must be described separately.

**We must not claim that the agent can issue arbitrary tokenized equities.** Discovering existing stock tokens, creating stock-paired thesis markets, and issuing securities are different capabilities.

## 2. What Muse Mirror taught us

The historical evidence comes from Muse's operational handoff, project memory and implementation, not just its listing description. These are lessons from past runs, not claims about Muse's current availability.

| Muse evidence | Lesson for Daybreak | Required proof |
| --- | --- | --- |
| MCP initialization and tool calls passed while some promised outputs were templates or incomplete | Protocol success is weaker than a useful completed task | An external caller must receive actual sourced data or a persisted Daybreak result |
| Muse moved from API delivery to A2A for longer creative jobs; its old MCP route now returns 410 | Choose transport around the work; do not copy a retired endpoint | Verify today's OKX listing contract and run a real client against it |
| Payment middleware consumed the request body, losing supplied arguments | Paid replay must preserve the original validated request | Same request before and after payment produces the same intended operation |
| Handoff records an accepted and settled A2A Creative Intelligence task | End-to-end delivery can work, but one success proves only that path | Track delivery, user-visible result and settlement separately |
| Provider availability depended on an awake laptop | Marketplace uptime needs an independent runtime | External request succeeds with the developer machine offline |
| Later work exceeded Vercel's request duration and moved to a durable worker | Long work needs persistent jobs, recovery and bounded stages | Restart during a job; resume without duplicating the business action |
| Test buyer and provider identities were confused during updates | Provider administration, buyers and Daybreak actors are distinct | Two buyers cannot access or mutate each other's account |
| Listing and README wording lagged behind the actual service type | Submission copy must describe the deployed product | Listing, docs, demo and tool inventory agree at release |
| Work began before all promised attachments arrived | Missing inputs are not permission to guess | Incomplete thesis/action input produces a clarification, not a mutation |
| Invalid or placeholder environment values caused upstream failures | An environment variable existing is not readiness | Exercise the intended provider with a real, non-sensitive readiness check |

Reuse the operational discipline: durable jobs, clean role separation, real external buyer tests and receipt reconciliation. Do not reuse Muse's creative-output pipeline, prices, provider identity, retired MCP implementation or July hackathon requirements.

The existing [News via Muse plan](NEWS-VIA-MUSE-AGENT-PLAN.md) is a separate creative-content proposal. It is not authority to generate factual market news or prices without sources.

## 3. Current Daybreak foundation and gaps

The following is based on inspected source, not proof of deployed execution.

| Capability | Existing foundation | Work required |
| --- | --- | --- |
| Eligible thesis quote instruments | `GET /api/v1/agents/instruments` | Adapter; clearly label coverage rather than calling this the complete stock catalog |
| Company and token discovery | Canonical company, Base, xStocks and PreStocks registries; `/api/mobile/companies` | Unified instrument response with chain, address, issuer/provider and supported operations |
| Equity reference prices | `/api/equity-prices` | Preserve source, timestamp and stale status; distinguish equity reference from token price |
| Base trade quote | `POST /api/trades/quote` | Read-only quote adapter; existing execution is disabled/external handoff |
| News | `/api/news`, PreStocks news routes | Bounded sourced results, freshness and coverage reporting; review redistribution terms |
| Public Circles | `/api/circles/public` | Expose public metadata and links; do not infer access to member content |
| Public thesis discovery and activity | `/api/v1/agents/theses` and detail/activity routes | Typed tools, pagination, filters and human-facing summaries |
| Public agent profiles | `/api/v1/agents/profiles/[publicId]` | Public profile adapter |
| Private agent account and limits | `/api/v1/agents/me`, `/me/limits`, `/me/portfolio` | Verified identity connection and delegated access |
| Paper thesis publication | `POST /api/v1/agents/paper/theses` | Validated tool, policy checks and idempotent receipt delivery |
| Paper quote and trade | `/api/v1/agents/paper/quotes`, `/paper/trades` | Quote review, expiry handling and authenticated execution |
| Operation reconciliation | `/api/v1/agents/requests/[idempotencyKey]` | Use after timeout before any retry |
| Flash stock purchases | `/api/v1/agents/flash/quotes`, `/setup`, `/orders` | Secure wallet review/signing integration; retain existing narrow policy |
| Live thesis creation and DBC thesis trading by agents | No equivalent supported agent API established in this inspection | Explicit website handoff initially; separate implementation and review before autonomous support |

Existing agent scopes are `read`, `paper:publish`, `paper:trade` and `live:flash`. Reuse their enforcement. Public strategy remains optional.

Public paper balances, trades and performance remain public as designed. Real private holdings, account data and gated Circle content do not become public because a caller uses OKX.

`/api/circles/news` requires user authentication and Circle access. `/api/me/briefing` is also private. Neither belongs in an anonymous market-data tool.

Never source production results from `lib/fixtures/instruments.ts`; those are simulation fixtures.

## 4. Integration architecture

### Two interfaces, one product

**Daybreak Market Data:** an A2MCP service for bounded structured requests. Start free so users and reviewers can try discovery immediately. The current OKX guide describes free HTTP responses and optional x402 payment; confirm its exact registration and request contract before implementing a transport. Do not assume the A2MCP label requires copying Muse's former JSON-RPC endpoint.

**Daybreak Agent:** an A2A conversational service for multi-step requests, clarification, user connection and durable action delivery. Use an always-on worker for task processing. Fast deterministic data reads should not require a long-running agent job.

Both interfaces call a shared Daybreak tool/service layer. Confirm whether one provider identity can expose both service types; if the platform requires separate service records, keep one Daybreak brand and document their roles. Do not attempt to migrate or modify Muse's listing.

```text
OKX structured calls ── market-data adapter ─┐
                                           ├─ Daybreak services and policies
OKX conversation ── durable A2A worker ──────┘       │
                                                    ├─ canonical registries and data sources
Daybreak web / mobile / agent SDK ───────────────────┤
                                                    └─ shared markets, account state and receipts
```

Extract reusable domain functions where routes currently contain business logic. Avoid duplicating trading rules or making internal services depend on loopback HTTP calls to our public domain.

### Proposed tool surface

Names below are proposed interfaces, not existing shipped tools.

| Tool | Behavior | Access |
| --- | --- | --- |
| `discover_stock_tokens` | Search company and canonical token identities, returning coverage and supported actions | Public |
| `get_stock_market_data` | Reference/token prices where available, with source, units, timestamps and stale state | Public |
| `get_company_context` | Sourced news, public Circle metadata and Daybreak links | Public |
| `find_theses` | Filter public live/paper theses and human/agent creators | Public |
| `get_thesis` | Details and bounded public activity | Public |
| `get_my_daybreak` | Actor, scopes, limits and permitted portfolio state | Connected |
| `prepare_paper_thesis` | Validate fields and return a publication summary without publishing | Connected |
| `publish_paper_thesis` | Publish under the connected actor and current policy | Paper publish scope |
| `quote_paper_trade` | Return exact spend/receive, fee, impact, expiry and market identity | Paper trade scope |
| `execute_paper_trade` | Execute the authorized, unexpired quote with a stable idempotency key | Paper trade scope |
| `get_operation` | Resolve an uncertain request to its existing receipt | Connected owner |
| `prepare_flash_order` | Prepare the currently supported stock-token limit-buy flow | Explicit live permission |
| `get_flash_order` | Read the connected actor's existing order status | Explicit live permission |

Submitting a signed Flash order is added only after the authenticated signing round trip passes the live gates. Until then, return a Daybreak review link and an accurate “awaiting signature” status.

### Data contract

Every response needs a schema version, request identifier, bounded data and a coverage/freshness description. Price records carry instrument identity, price currency, price kind, source, `asOf`, `fetchedAt` and stale state. Monetary amounts use decimal strings; onchain quantities include decimals and raw amount where needed.

A stock ticker alone is insufficient identity. Include chain and canonical contract/mint. Keep underlying equity price, stock-token market price and executable quote distinct. A reference price must never silently become an execution price.

Return explicit unavailable/partial results when providers fail. Never substitute invented numbers, empty success messages or simulation output. Paginate activity and limit news to permitted excerpts plus original links. Check upstream redistribution and commercial-use terms before exposing or charging for raw feeds.

## 5. Identity and authorization: the first critical proof

We have not yet established the secure OKX requester-to-Daybreak-account binding. Resolve this before enabling mutations.

1. Verify how the current OKX protocol authenticates the requester, task and callback. A model-supplied user ID is not identity.
2. Open a Daybreak connection page using an expiring, single-use request bound to the verified requester and intended callback. Validate nonce, expiry, redirect allowlist and replay protection.
3. The user signs into Daybreak and selects the actor and exact permissions. Show public paper visibility, allowed instruments and limits. Do not require a public strategy.
4. Store the verified mapping and a scoped credential reference server-side. Existing API keys are digest-only; do not assume their plaintext can be retrieved. Use a purpose-specific delegated grant or securely provisioned scoped credential that passes the shared policy evaluator.
5. Keep credentials out of prompts, tool arguments, attachments, analytics and task messages. Recheck revocation, scope, actor status and limits on every action.
6. Support disconnect and grant expiry. Cross-account caches and receipts must be isolated.

If OKX cannot securely carry or establish the required binding, keep public tools available and use authenticated Daybreak browser handoffs for mutations. That is a documented limitation, not a completed autonomous-action integration.

A dedicated demonstration actor may be used only as that named actor. A global provider/admin key must never impersonate arbitrary customers.

Service payment grants service access. It does not grant permission to publish a thesis, spend paper funds or sign a live transaction.

## 6. Action semantics and recovery

Paper activity uses the existing shared server-authoritative markets, balances and trade ledger. No local mock market or parallel OKX ledger.

For each action, validate the market, actor, side, instrument, amount and policy. Prepare a clear summary before execution. A connected agent can operate within the owner's explicit delegation; otherwise request approval. Do not turn a news article, quoted thesis or vague chat statement into authorization.

Paper quotes currently expire after 60 seconds. Expired quotes require a fresh review if terms change. Bind execution to the reviewed quote and preserve the same idempotency key across transport retries. After a timeout, reconcile through the receipt endpoint before attempting another write. Never retry an uncertain trade with a newly generated key.

Durable task states should distinguish `queued`, `running`, `awaiting_connection`, `awaiting_approval`, `completed`, `failed` and `unknown`. Persist the business operation ID before delivery. A task is complete only when its actual result exists and the result link or receipt can be opened.

### Flash boundary

The inspected agent API supports a **USDC-funded Solana limit buy of the stock token paired with a published live thesis**. It does not Back the thesis token, offer every Flash order type, or buy arbitrary stock tokens on arbitrary chains.

Retain the dedicated standard Ed25519 Solana wallet requirement, allowed instrument, per-order/day USDC caps, policy version and signed setup/order intent. Daybreak must not receive wallet private keys. Wallet signing is a distinct step from OKX service payment.

Separate prepared, submitted, open, filled, rejected and unknown status. Pending or uncertain orders continue reserving the budget under existing rules. Revoking Daybreak access is not cancellation of existing Flash orders or SPL delegations; expose the applicable existing management flow accurately.

No funded trade is part of verification without explicit wallet and spend authorization. A quote-only test must be labeled quote-only.

## 7. Deployment and operations

Keep public stateless endpoints on the existing web deployment. Put the A2A provider on an isolated always-on runtime with its own service user, secrets and durable job storage. The existing Muse host may be infrastructure experience, but neither its identity nor its running service should be changed for Daybreak.

The worker needs bounded concurrency, job leases, retry classification, restart recovery and graceful shutdown. Persist operation state before acknowledging delivery. Apply per-caller rate limits and upstream budgets. Record request/task/receipt IDs and latency without logging credentials or private payloads.

Readiness checks must exercise required providers and distinguish optional data degradation from unavailable actions. Alert on stuck tasks, repeated authentication failures and provider outage. Verify recovery with the developer laptop offline and with the worker restarted during an in-flight task.

If paid data is added later, use the current supported seller SDK and verified chain/asset configuration. Test unpaid challenge, paid replay, replay protection and successful output delivery. Preserve the request body across middleware. A 402 response alone proves none of the paid workflow.

Keep the first release's core discovery free. Price advanced recurring or analytical services only after measuring operating cost and confirming data rights; do not copy Muse's creative-service pricing.

## 8. Daybreak UI changes

Use the existing clean design. OKX supplies the conversation interface; a second embedded chat UI is not needed for this release.

- Add a small “Use with OKX AI” entry with the working service link and copyable instructions.
- Add a profile connection row showing the connected actor, scopes and disconnect action.
- Use one concise authorization screen: identity, permitted action, limits and paper/public status.
- Deep-link every company, Circle and thesis result back to its existing Daybreak screen.
- Reuse existing quote/review surfaces for live signing and show status after returning from the wallet.

Avoid technical transport names in consumer copy. Use “Connect Daybreak,” “Review paper trade” and “Review stock order.” Keep “paper” visible on simulated actions without describing all conviction markets as paper.

## 9. Build sequence and acceptance gates

Dates are a target schedule against the current September 25 deadline, not a promise to bypass unfinished gates.

### Phase 0 — Protocol and identity proof, September 21

- Record the pre-integration commit and confirm the official eligible build window.
- Verify current A2MCP registration, A2A task delivery, requester authentication, signing handoff and service-type rules.
- Use the current OKX skill/preflight instructions during implementation, not Muse's July CLI commands.
- Decide the exact account-binding mechanism with a minimal two-user proof.

**Gate:** a real external read request succeeds; forged requester identity is rejected; the chosen action connection can be demonstrated or explicitly remains browser-only. Document unresolved platform restrictions before building around them.

### Phase 1 — Useful public data, September 21–22

- Build the canonical catalog adapter and source-aware price/news/context tools.
- Expose public thesis discovery and activity through the shared tool catalog.
- Publish a working free service once the registration contract is proven.

**Gate:** an external caller resolves a company to the correct chain/mint, sees a timestamped price and source, opens a real thesis, and gets an honest partial response during an upstream outage. No private Circle content appears anonymously.

### Phase 2 — Connected public paper actions, September 22–23

- Implement scoped connection, revocation and policy reuse.
- Add prepare/publish thesis, quote/trade and receipt reconciliation.
- Extend API documentation and SDK examples where necessary.

**Gate:** one connected actor publishes a real public paper thesis; a distinct authorized actor Backs it. The resulting balances, activity and receipts persist across refresh and are visible through Daybreak's existing public experience. A duplicate delivery does not duplicate the trade. An unrelated user cannot read private account state or execute as either actor.

### Phase 3 — Conversational A2A delivery, September 23–24

- Connect the same tools to the conversational provider.
- Add missing-field clarification, durable tasks, result delivery and always-on deployment.
- Maintain deterministic policy enforcement outside the language model.

**Gate:** an external user completes discovery → connection → authorized paper action → receipt from OKX. Restart the worker mid-task and verify recovery without duplicate publication/trading. Repeat with the development laptop offline.

### Phase 4 — Supported live review, September 24

- Integrate the existing Flash preparation path and Daybreak wallet review.
- Add signed submission only if the identity/signing gates pass; otherwise accurately ship review handoff.
- Keep live thesis creation and Meteora DBC trading as explicit web handoffs until dedicated agent support is implemented and reviewed.

**Gate:** the correct stock mint, USDC amount, limit price, wallet and caps survive the full review flow. Rejected/expired signatures cannot submit. Only claim order execution when an authorized real order has a verifiable receipt; submission is not a fill.

### Phase 5 — Release and submission, September 25

- Audit capability descriptions against deployed tools and actual evidence.
- Record a 2–4 minute demo, update README and link the service/integration.
- Document which commits are new hackathon work, including how OKX adds capability beyond a listing.
- Run an external reviewer journey with no developer session or special credentials.

**Gate:** all advertised paths have evidence, links work for reviewers, source access meets the brief, and the submission distinguishes completed features from limitations. Submit only through the separately authorized submission workflow.

The complete live parity expansion remains a subsequent build: dedicated agent APIs for live thesis publication and DBC thesis trades, transaction simulation, explicit signing and the same policy/idempotency guarantees. Do not advertise those as completed by the initial Flash adapter.

## 10. Verification matrix

| Test | Expected result |
| --- | --- |
| Equity symbol maps to multiple token forms | Each chain/address remains distinct; unsupported actions are explicit |
| Stale or unavailable upstream price | Stale/unavailable result with source metadata; no invented fallback |
| Private Circle news requested anonymously | Access denied or public metadata only |
| Forged requester or cross-account receipt lookup | Rejected without leaking account existence/details |
| Revoked grant or changed policy | Next action denied or re-reviewed under current policy |
| Expired paper quote | Cannot execute stale terms |
| Repeated task delivery / network timeout | Existing operation reconciled; no duplicate ledger write |
| Worker restart after mutation but before reply | Original receipt delivered after recovery |
| Malicious instructions in news or thesis content | Treated as data; no tool permission gained |
| Live amount or mint differs from reviewed intent | Rejected before submission |
| Unknown Flash result | Shown as unknown/pending; budget not silently released |
| Optional paid request replay | Original arguments preserved; payment verified; result actually delivered |

Use existing domain tests plus adapter contract and integration tests. Include a real external-client smoke test; local mocks cannot prove marketplace compatibility. Do not make mainnet spending an automatic CI test.

Maintain an evidence table per capability with separate columns for source implemented, deployed, external caller tested and live/paper receipt. Never collapse those into a single “done” check.

## 11. Proposed implementation files

These are proposed locations; adapt to existing conventions during implementation.

- `lib/okx/tools/`: shared tool definitions, schemas and result shaping.
- `lib/okx/identity/`: verified requester binding and scoped delegation.
- `app/api/okx/`: protocol adapters and connection callbacks, once the protocol is confirmed.
- `ops/okx/`: isolated A2A worker and deployment configuration.
- `docs/okx/`: current listing text, operations runbook and evidence matrix.
- Existing agent services and `packages/agent-sdk`: reuse or extract shared enforcement rather than fork it.
- `public/llms.txt`, agent OpenAPI and quickstart: document actual supported capabilities and limitations.

Suggested initial service description:

> Discover tokenized stocks, sourced market context and public conviction markets on Daybreak. Connect your Daybreak actor to create and trade public paper theses within your permissions. Supported live stock orders open a separate wallet review flow.

Update that description only when additional paths pass their gates.

## 12. Hackathon fit and resources

The official brief's Build a Company track allows a working service published or integrated through OKX AI. That matches this plan without forcing Daybreak markets onto a new chain. Build a Market requires a working X Layer integration, which this plan does not establish.

The current deadline is **September 25, 2026 at 23:59 UTC** (September 26 at 00:59 in Lagos). The brief requests a **2–4 minute demo**. Existing projects must clearly identify new work during the official build period; a new listing alone is insufficient. Confirm the chosen participation route and eligible period when preparing submission.

### Current official references

Checked September 21, 2026; recheck operational contracts before implementation.

- [OKX Dev Day builder kit and submission requirements](https://www.okx.com/learn/okx-dev-day-builder-kit)
- [OKX Dev Day terms](https://www.okx.com/learn/okx-dev-day-terms)
- [A2MCP service integration](https://web3.okx.com/onchainos/dev-docs/okxai/howtomcp)
- [A2A provider overview](https://web3.okx.com/onchainos/dev-docs/okxai/how-to-become-a2a)
- [Provider registration](https://web3.okx.com/onchainos/dev-docs/okxai/registerasp)
- [One-off A2A tasks](https://web3.okx.com/onchainos/dev-docs/okxai/a2a-no-subscription)
- [Payment seller SDK](https://web3.okx.com/onchainos/dev-docs/payments/service-seller-sdk)
- [X Layer overview](https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/about-xlayer)

### Daybreak implementation references

- [Agent quickstart](agents/QUICKSTART.md)
- [Agent OpenAPI](agents/openapi.yaml)
- [Agent authentication](../lib/agents/auth.ts)
- [Agent API routes](../app/api/v1/agents)
- [Company registry](../lib/assets/companies.ts)
- [Base tokens](../lib/base/tokens.ts)
- [xStocks registry](../lib/solana/xstocks-registry.ts)
- [PreStocks registry](../lib/solana/prestocks-registry.ts)
- [Thesis instruments](../lib/theses/instruments.ts)

### Historical Muse references

These are local working-history sources outside the Daybreak repository, not public reviewer links:

- `~/brain/projects/MUSE-MIRROR.md`: chronology, incidents and operational lessons.
- `../muse-mirror/HANDOFF.md`: July operational handoff and recorded end-to-end delivery.
- `../muse-mirror/LISTING.md`: historical listing; stale relative to the later A2A handoff.
- `../muse-mirror/app/api/mcp/route.ts`: retired endpoint returning 410 at inspection.
- `../muse-mirror/app/api/x402/creative-direction/route.ts`: paid-request handling history.
- `../muse-mirror/ops/a2a/AGENTS.md`: provider operations context.
- `../muse-mirror/ops/capsule-calibration-worker.mjs`: durable-worker implementation reference.

Before publishing the submission, replace internal-history references with a concise public lessons/evidence summary where reviewers need context. Do not publish credentials, private task payloads or deployment secrets.
