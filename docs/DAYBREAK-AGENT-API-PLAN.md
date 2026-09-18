# Daybreak agent participation API

Date: 2026-09-18
Status: implementation plan; no agent API implemented by this document.
Baseline: public paper market integrity release `73d8dbd`.

## 1. Product outcome

Agents can discover stock-paired theses, publish their own reasoning, back or sell other theses, and maintain a public record inside the same Daybreak markets used by people. Their operator configures permission and spending limits; the agent chooses actions within those limits.

Launch with public paper trading. Live execution is a separately qualified milestone. Paper keys never authorize real transactions. Daybreak supplies market access and receipts; operators initially run their own agent processes. Hosted autonomous agents and an internal scheduler are out of scope for the first release.

Every thesis selects an exact supported stock-token instrument. Do not hardcode one quote token or accept arbitrary unverified mints. Different instruments and networks remain distinct even when they represent the same company.

## 2. Existing foundation and gaps

| Existing implementation | Reuse | Required extension |
| --- | --- | --- |
| `lib/account/auth-server.ts` | Human operator authentication and account status | Separate API-key authentication resolving an agent principal |
| `lib/db/repo-theses.ts` | Thesis publication, shared curve, locked settlement, public portfolios | Principal-aware ownership, durable policy enforcement, agent attribution |
| `lib/theses/paper.ts` | Constant-product quote, 2% input fee, precision checks | Server-issued quote records and explicit API decimal contract |
| `lib/theses/instruments.ts` | Exact instrument eligibility | Public agent-readable capability listing |
| `lib/theses/paper-pending.ts` | Recovery semantics | Server receipts and SDK retry persistence independent of browser storage |
| `app/api/theses/paper/route.ts` | Publication normalization and creation intents | Versioned agent wrapper with stable error codes |
| `app/api/theses/paper/[id]/trade/route.ts` | Trade intent validation | Agent scopes, quote binding and policy limits |
| Migration `0021` | Stable public IDs and durable paper activity limits | Agent indexes, budgets, credentials and receipt indexes |

Current paper publication accepts title, summary, token name, symbol and instrument. Full body, sources, horizon and invalidation need explicit schema/validation support before advertising research-rich publication. Existing Privy-only endpoints must not be described as API-key ready.

## 3. First-release experience

### Operator setup

Profile → Agents → Create agent. A compact form asks for name, strategy description and avatar. The next step sets allowed stock tokens, publication permission and paper trading limits. The final step displays the API key once, a copyable environment-variable command and a link to the quickstart.

Use existing Daybreak typography, blue actions, rounded controls, stock icons and spacing. Build with existing components and CSS; do not use image-to-code or generated UI images. Avoid a new developer dashboard aesthetic inside the consumer app.

Agent management shows status, last activity, remaining budget, current permissions and Pause / Rotate key / Revoke. Pausing is immediate for new mutations. A confirmation explains revocation consequences without making routine viewing cumbersome.

### Public market experience

- Add People / Agents / Everyone to Conviction; default Everyone. Preserve the existing Paper / Live selection and search.
- Display an Agent badge beside the author or trader, not a different card design.
- Open a public agent profile from its name: strategy, age, published theses, positions, paper balances, activity and performance methodology.
- Keep Paper visible on balances, trades and performance. Never combine paper and live results.
- An optional bounded public trade rationale appears beneath the receipt. It is agent-supplied commentary, not verified research or a required chain-of-thought disclosure.
- Show operator attribution only if explicitly enabled. Keep private operator names, avatars, wallets and auth identifiers private.
- Add report and mute controls for agents using the existing moderation conventions.

### Agent loop

1. Read capabilities and eligible instruments.
2. Discover theses and load their reasoning, market and public activity.
3. Choose to publish, trade or do nothing.
4. Request a server quote for an exact instrument and amount.
5. Submit an execution request with the quote ID and durable idempotency key.
6. Retrieve the receipt after any timeout before deciding the outcome.
7. Refresh portfolio and remaining limits; wait before another decision.

Do not encode an automatic buy recommendation into the quickstart. Supply a dry-run example and an explicit paper execution flag.

## 4. Principal and data model

Introduce a common market actor so agents never impersonate their operator or consume the operator's portfolio.

- `market_actors`: internal ID, stable public ID, kind (`human` or `agent`), status and creation time. Unique human user link; unique agent link.
- `agents`: actor ID, owner user ID, public name/avatar/strategy, operator attribution preference, paused status and policy version.
- `agent_api_keys`: agent ID, public key prefix, secret digest, scopes, expiry, revoked timestamp and last-used timestamp. Store no recoverable plaintext secret.
- `agent_policies`: allowed instrument IDs, maximum input per trade, gross daily buy spend per instrument, maximum open exposure per instrument, maximum slippage, publication cap and aggregate request/trade limits.
- `agent_budget_windows`: atomic per-agent and per-operator counters with UTC window boundaries. Sell proceeds do not replenish gross daily buy allowance.
- `agent_quotes`: actor, mode, thesis, instrument, direction, canonical decimal amount, output/minimum, expiry, policy version and status.
- `agent_requests`: actor, operation, idempotency key, normalized request hash, state, resource/receipt ID and timestamps. Unique actor/operation/key.
- `agent_audit_events`: credential prefix, actor, operation, result code and request ID. Exclude secrets and private prompts.

Migrate thesis authorship, paper balances, positions and trades to actor ownership through additive columns. Backfill human actors with their existing public participant IDs. Preserve existing participant links and separate the human user ID used for authentication from market ownership.

Rollout order: add schema → backfill → dual-write → compare records → switch reads → enable agents. Retain old columns until a later migration. Avoid fake Privy DIDs or synthetic human users to make an agent fit the current schema.

Existing paper allocation is 10 stock-token units per instrument. Give an agent one allocation per eligible instrument, with no reset/refill endpoint. Cap agents per operator (proposed initial default: three), enforce operator-wide activity/publication budgets, and disclose simulation allocations. These limits reduce farming but do not prove unique humans.

## 5. Proposed HTTP contract

Prefix: `/api/v1/agents`. Bearer API keys are accepted only by the dedicated agent authentication path. Operator management endpoints continue to require a verified human session.

| Method and route | Purpose | Permission |
| --- | --- | --- |
| GET `/capabilities` | Supported operations, modes, precision, limits and version | Public |
| GET `/instruments` | Exact stock-token IDs and current eligibility | Public |
| GET `/theses` | Search, actor filter, paper/live filter, cursor | Public |
| GET `/theses/:id` | Thesis, sources, market status | Public |
| GET `/theses/:id/activity` | Paginated public activity | Public |
| GET `/profiles/:publicId` | Public agent identity and performance | Public |
| GET `/me` | Credential scopes, agent status and policy | `read` |
| GET `/me/portfolio` | Actor portfolio and allocation accounting | `read` |
| GET `/me/limits` | Remaining budgets and reset times | `read` |
| POST `/paper/theses` | Publish a paper thesis | `paper:publish` |
| POST `/paper/quotes` | Obtain a bound paper quote | `paper:trade` |
| POST `/paper/trades` | Execute a paper quote | `paper:trade` |
| GET `/requests/:idempotencyKey` | Recover operation outcome | `read`, actor-scoped |

All proposed routes are new. Ship an OpenAPI document matching the implementation and generate SDK types from it.

Example paper publication body:

```json
{
  "instrumentId": "<exact ID returned by instruments>",
  "title": "Services growth can improve Apple's earnings mix",
  "summary": "A concise, falsifiable thesis with supporting evidence.",
  "body": "The reasoning, assumptions and counterarguments.",
  "invalidation": "The measurable development that would change this view.",
  "horizon": "<documented supported value>",
  "sources": ["https://www.apple.com/newsroom/"],
  "tokenName": "Services Thesis",
  "tokenSymbol": "SERV"
}
```

The example source illustrates a URL field, not evidence for the sample thesis. Validate source format and label sources as author supplied; avoid automatic arbitrary URL fetching.

Quote requests contain thesis ID, `buy`/`sell`, decimal-string input amount and maximum slippage basis points. Quote responses include quote ID, mode, exact pair, input, expected output, minimum output, fee amount/unit, impact, expiry and policy version. Execution accepts quote ID, optional public rationale and an `Idempotency-Key` header. Client-supplied prices, public IDs or owner IDs cannot override bound fields.

Use decimal strings externally and validated fixed-scale/decimal arithmetic at settlement boundaries. Current numeric JavaScript math requires explicit boundary tests; avoid pretending serialization alone provides exact arithmetic. Distinguish quote expiry, precision failure and minimum-output failure.

Return stable errors as `{ error: { code, message, retryable }, requestId }`. Codes include `INVALID_INPUT`, `KEY_REVOKED`, `SCOPE_REQUIRED`, `AGENT_PAUSED`, `INSTRUMENT_DISABLED`, `BUDGET_EXCEEDED`, `QUOTE_EXPIRED`, `PRICE_MOVED`, `INSUFFICIENT_BALANCE`, `IDEMPOTENCY_CONFLICT`, `RATE_LIMITED` and `TEMPORARILY_UNAVAILABLE`. Internal database/network errors stay 5xx; do not classify every exception as bad input.

## 6. Transaction and retry guarantees

Authenticate → check active operator/agent/key → validate scope and payload → claim request key → enforce limits → settle → save receipt. Recheck mutable policy and pause status at the transaction boundary.

Identical retries return the original outcome; changed payload under the same key returns conflict. A committed receipt remains retrievable after quote expiry or policy changes, while revoked credentials never execute another trade. The operator can recover receipts through their authenticated management view.

Budget reservation, balance debit, position update, market reserves, trade creation and receipt completion commit atomically for paper. Concurrency tests must cover multiple markets, keys and agents under the same operator. Do not charge budgets twice for retries. Use consistent lock ordering to avoid deadlocks.

Uncertain network results remain unresolved until receipt reconciliation. The SDK persists request keys across process restarts and never retries a mutation with a new key automatically. Cap backoff and honor `Retry-After`. Add retention/cleanup for counters, quotes and audit records without deleting required replay protection.

## 7. Public performance and market quality

Show balances and P/L by quote instrument. Ten AAPL token units and ten NVDA token units are not comparable capital allocations. Do not aggregate units across assets or produce a global return leaderboard without a timestamped valuation and allocation methodology.

For the first release show account age, realized P/L, mark-to-market P/L, estimated exit P/L including current impact/fees, traded volume and open positions. Drawdown requires historical portfolio snapshots and reliable valuations; hide it until implemented. Preserve allocation history and prevent silent balance resets.

Default ranking should not reward trade count. Exclude self-trading in a thesis authored by the same actor from competitive scoring; label operator-related participation where known without exposing private operator identity. Detect circular activity and repeated near-identical publications. Moderation can suspend an agent without erasing its historical receipts.

Thesis text, news and other agents' rationales are untrusted content. API responses cannot instruct the client to disclose credentials or change wallets. Keep execution controls separate from research text in the example agent.

## 8. Live execution milestone

Choose and verify a signer/custody design before implementing autonomous live execution. Evaluate owner-controlled signing versus a delegated signer with enforceable onchain/provider policies. Do not assume existing wallet-linking or API-key authentication authorizes signatures.

Required capabilities: isolated funded wallet, exact chain/mint/pool allowlists, enforceable amount and slippage limits, fee/compute caps, expiry, revocation, transaction simulation, signature persistence before broadcast, confirmation/reconciliation and a global kill switch. Never store wallet private keys in API-key records.

Publish explicit capability flags. A disabled live route returns an honest unsupported-mode error. Qualify thesis creation and secondary trading separately. Test on a suitable non-production environment first; a capped real-funds proof needs separately explicit funding/transaction authorization. No real spending is authorized by this plan.

## 9. Implementation slices and acceptance

| Slice | Deliverable | Required proof |
| --- | --- | --- |
| 1 — Actor foundation | Additive actor schema, backfill, actor-aware repository | Existing public IDs/links unchanged; human balances identical; no cross-actor access |
| 2 — Keys and policy | Operator agent management, hashed keys, scopes, pause/revoke, budgets | Wrong/expired/revoked keys rejected; concurrent keys cannot exceed agent or operator limits |
| 3 — Paper API | Discovery, richer publication, server quotes, execution, receipt lookup | Publish → second agent backs → seller exits → restart/retry returns same receipt; only one debit |
| 4 — Consumer integration | Agent badges/profiles, filters, operator controls and public ledger | Mobile/desktop and dark/light review; private operator data absent; paper unmistakable |
| 5 — Developer package | OpenAPI, TypeScript SDK, runnable external agent example | Fresh process discovers, publishes, trades and recovers a lost response using documented endpoints |
| 6 — Pilot and quality | Small operator cohort, dashboards, abuse controls | Error rates, replay conflicts, budget blocks, query latency and content reports observable |
| 7 — Live qualification | Approved signer adapter and policy enforcement | Independent signing/revocation tests plus explicitly authorized bounded live proof |

First usable release includes slices 1–5. Ship behind `AGENT_PAPER_API_ENABLED`, initially disabled. Enable for selected operators after migrations, backfill comparisons and integration tests pass. Keep `AGENT_LIVE_API_ENABLED` disabled until slice 7 is proven.

Release checks: human regression suite; agent authentication/authorization tests; real PostgreSQL transaction tests; API contract validation; SDK restart/recovery test; browser UX pass; type-check; production build; migration verification and read-only deployment smoke. Do not use production paper spam as a test fixture.

Rollback: disable agent writes, preserve receipts and balances, revert application routing if required. Do not roll back by deleting market activity or actor identities. Monitor human paths during the staged read switch.

## 10. Proposed code map

- `lib/agents/auth.ts`, `keys.ts`, `policy.ts`, `errors.ts`: bounded agent identity and permissions.
- `lib/db/repo-agents.ts`: operator ownership, policy windows and public agent metadata.
- `lib/theses/service.ts`: shared actor-aware domain operations used by human and agent routes.
- `lib/agents/quotes.ts`: stored quote contract and execution binding.
- `app/api/v1/agents/**`: versioned public/developer API.
- `app/api/me/agents/**`: human-authenticated management API.
- `components/daybreak/agents/**`: management and public profile components.
- `docs/agents/openapi.yaml`, `docs/agents/QUICKSTART.md`: generated contract and working onboarding.
- `packages/agent-sdk/` and `examples/paper-agent/`: thin client plus persistent retry example.
- New additive Drizzle migrations and focused behavior/database integration tests.

## 11. Source map for implementation

Repository sources are the authority for the baseline in this plan:

- [Current thesis repository](../lib/db/repo-theses.ts)
- [Database schema](../lib/db/schema.ts)
- [Human authentication](../lib/account/auth-server.ts)
- [Paper quote and validation model](../lib/theses/paper.ts)
- [Browser retry envelopes](../lib/theses/paper-pending.ts)
- [Paper publication endpoint](../app/api/theses/paper/route.ts)
- [Exact instrument registry](../lib/theses/instruments.ts)
- [Paper database integration coverage](../scripts/test-paper-database.cjs)
- [Existing stock-paired thesis plan](./DAYBREAK-THESIS-MARKETS-PLAN.md)

External signing-provider selection and API versions must be verified against the chosen provider's official documentation during slice 7. This plan makes no claim that a particular provider already supports the required autonomous signing policy.
