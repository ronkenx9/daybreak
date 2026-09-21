# Daybreak service on OKX AI

Implementation status: source built locally. Registration, external marketplace call and A2A deployment need separate evidence before they can be described as live.

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
- Description: “Discover canonical stock-token identities, sourced market context, public Circles and conviction markets on Daybreak. Timestamped equity references and direct links show where each result came from.”
- Parameters: JSON `tool` string and `arguments` object. The GET catalog lists available names.
- A2A service: separate registration only after the provider runtime is independently online and its account binding and task delivery have been proven. Do not claim this listing already exists.

## Release evidence

| Capability | Source | Local proof | Deployed proof | External OKX proof |
| --- | --- | --- | --- | --- |
| Public data tools | `/api/okx/tools` | `node scripts/test-okx-integration.cjs` | Pending | Pending |
| Scoped paper routing | `/api/okx/tools` → agent routes | `npm run test:agent-api` plus integration test | Pending | Pending |
| A2A provider bridge | `ops/okx/tool.mjs` | Local CLI smoke pending | Pending | Pending |
| Customer account binding | No implemented verified OKX identity transport | Pending | Pending | Pending |
| Flash order preparation | Existing agent route via service tool | Existing agent API verification | Pending | Pending |

Before registration, test the deployed HTTPS endpoint from a machine outside the developer environment, read the current [OKX A2MCP guide](https://web3.okx.com/onchainos/dev-docs/okxai/howtomcp), run the required wallet preflight, and capture the provider/service ID returned by registration. Listing publication uses the current OKX registration flow; no ID is inferred from a local endpoint. For A2A, complete the separate current task-lifecycle verification and keep an always-on runtime. The Daybreak marketplace listing and its public URL should be added here only after they exist.
