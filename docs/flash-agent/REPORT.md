# Agent-driven Flash stock orders: release status

The implementation adds owner-controlled wallet binding and USDC limits, scoped agent keys, signed Flash limit-order quoting/setup/submission, an atomic daily reservation ledger, readback, SDK methods, a dry-run example, and agent documentation. It buys the exact stock token paired with a published Live thesis; it does not trade the thesis token.

## Verification

- `GATES.md`: all seven gates passed on 2026-09-19, including an isolated production build, typecheck, 43 acceptance groups, and an isolated PostgreSQL integration test.
- The PostgreSQL test applied `0023_agent_flash_orders.sql` only to its disposable local test database and exercised key rotation, revocation, replay protection, and concurrent daily-budget requests.
- Both OpenAPI copies parse as YAML and are identical.
- No real wallet signature, funded-wallet order, or production Flash transaction was used in the checks.

## Production release

The owner approved applying `drizzle/0023_agent_flash_orders.sql` and pushing to `main`. The migration was applied to the configured production Supabase database on 2026-09-19 before the code push. `npm run db:verify` confirmed 48 expected tables with RLS, complete actor backfill, all four Flash policy columns, the three order-ledger indexes, and no direct `anon` or `authenticated` table access. The migration adds persistent owner opt-in fields and an agent order ledger with restricted database access.

After deployment, check `/api/v1/agents/capabilities`. A controlled funded-wallet smoke test requires an owner-authorized agent and a dedicated wallet; it was not part of automated verification. Existing paper keys remain paper-only; the owner must opt in and issue a new `live:flash` key.
