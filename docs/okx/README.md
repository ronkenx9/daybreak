# Daybreak service on OKX AI

Implementation status: the free tool endpoint is deployed on Daybreak's production domain. The Daybreak provider identity was registered on OKX AI as agent #13838 on 2026-09-21, using the Daybreak head avatar, and OKX's local communication runtime passed its readiness check. Marketplace listing review, an external marketplace call, customer account binding and A2A provider deployment still need separate evidence before they can be described as live.

The free A2MCP endpoint is `POST https://www.daybreakcircles.lol/api/okx/tools`. `GET` on the same URL returns the current tool catalog and access requirements. A request has the shape:

```json
{"tool":"discover_stock_tokens","arguments":{"query":"NVDA","limit":5}}
```

```sh
curl -sS -X POST 'https://www.daybreakcircles.lol/api/okx/tools' \
  -H 'content-type: application/json' \
  --data '{"tool":"discover_stock_tokens","arguments":{"query":"NVDA","limit":5}}'
```

Public tools are `discover_stock_tokens`, `get_stock_market_data`, `get_company_context`, `find_theses`, `get_thesis`, and `get_thesis_activity`. Responses include schema version, request ID, fetch time and coverage. Equity prices are labeled as underlying equity references; they are not executable token quotes. News results contain linked headlines, not full articles. Public Circle metadata never grants holder-only Circle content.

Connected tools require a scoped Daybreak agent key in the **Authorization header**, not in arguments or chat. This is the existing Daybreak agent identity; the service never accepts a claimed OKX user ID as authority. The tool endpoint delegates paper publication, quotes, trades and operation lookup to the existing agent routes, preserving scope, limits, quote expiry and idempotency. `prepare_flash_order` calls the existing owner-enabled Flash quote route, which still requires a separate live key and wallet review. The endpoint cannot submit a signed order.

The provider bridge is `ops/okx/tool.mjs`. It reads a JSON call on stdin and can hold one actor's key in a process environment. Paper writes require a deliberate runtime enable flag, an explicit confirmation field and a stable idempotency key. Its operating rules are in `ops/okx/AGENTS.md`. A customer-specific account connection from OKX has **not** been proven. Without a verified platform requester binding, the provider may read public data and operate only its own named agent actor; a customer's mutations remain a Daybreak browser handoff.

## Listing packet

- Name: Daybreak — Stock Tokens and Conviction
- Type: A2MCP, free
- Endpoint: `https://www.daybreakcircles.lol/api/okx/tools`
- Service name: Daybreak Market Discovery
- Draft service description for OKX validation (four required lines):

  ```text
  1. [Service Description] Discover canonical stock tokens, sourced company context, public Circles and conviction markets on Daybreak. Results include sources, timestamps and direct links.
  2. [Parameter Spec] tool(string, required): one catalog tool name; arguments(object, required): tool-specific parameters such as query and limit.
  3. [Request Method] POST
  4. [Request Example] curl -sS -X POST 'https://www.daybreakcircles.lol/api/okx/tools' -H 'content-type: application/json' --data '{"tool":"discover_stock_tokens","arguments":{"query":"NVDA","limit":5}}'
  ```
- Parameters: JSON `tool` string and `arguments` object. The GET catalog lists available names.
- A2A service: separate registration only after the provider runtime is independently online and its account binding and task delivery have been proven. Do not claim this listing already exists.

## Release evidence

| Capability | Source | Local proof | Deployed proof | External OKX proof |
| --- | --- | --- | --- | --- |
| Public data tools | `/api/okx/tools` | `node scripts/test-okx-integration.cjs` | Production HTTP returned NVDAc, NVDAx, sourced NVDA reference price, public Circle and paper thesis on 2026-09-21 | Provider #13838 created; marketplace invocation pending |
| Scoped paper routing | `/api/okx/tools` → agent routes | `npm run test:agent-api` plus integration test | Production unauthenticated publication returned HTTP 401 | Pending |
| A2A provider bridge | `ops/okx/tool.mjs` | Local CLI discovery succeeded; unconfirmed action exited before network call | Pending | Pending |
| Customer account binding | No implemented verified OKX identity transport | Pending | Pending | Pending |
| Flash order preparation | Existing agent route via service tool | Existing agent API verification | Pending | Pending |

OKX `agent validate-listing` passed with no findings before registration. `agent create` returned provider ID `13838`; it did not return a service ID. `okx-a2a doctor --fix --json` subsequently reported `ready: true` (CLI 0.2.16, three identities refreshed). Submit the provider for OKX listing review through the current OKX workflow, then verify an external marketplace invocation and record the public listing URL once it exists. For A2A, complete the separate current task-lifecycle verification and keep an always-on runtime.
