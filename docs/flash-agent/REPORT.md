# Agent-driven Flash stock orders: release status

The implementation is complete in the local working tree. It adds owner-controlled wallet binding and USDC limits, scoped agent keys, signed Flash limit-order quoting/setup/submission, an atomic daily reservation ledger, readback, SDK methods, a dry-run example, and agent documentation. It buys the exact stock token paired with a published Live thesis; it does not trade the thesis token.

## Verification

- `GATES.md`: all seven gates passed on 2026-09-19, including an isolated production build, typecheck, 43 acceptance groups, and an isolated PostgreSQL integration test.
- The PostgreSQL test applied `0023_agent_flash_orders.sql` only to its disposable local test database and exercised key rotation, revocation, replay protection, and concurrent daily-budget requests.
- Both OpenAPI copies parse as YAML and are identical.
- No real wallet signature, funded-wallet order, or production Flash transaction was used in the checks.

## Release dependency

Production must apply `drizzle/0023_agent_flash_orders.sql` before any deployment of this code. The agent policy queries now read four new columns and the limits endpoint reads the new order ledger, so deploying code first would break existing agent routes. The migration adds persistent owner opt-in fields and an agent order ledger with restricted database access.

Applying that migration to the configured production Supabase database was rejected by automatic approval review. Do not deploy or push this revision to `main` until the migration is explicitly approved and applied. Once applied, deploy the code, check `/api/v1/agents/capabilities`, then perform a controlled funded-wallet smoke test with an owner-authorized agent. Existing paper keys remain paper-only; the owner must opt in and issue a new `live:flash` key.
