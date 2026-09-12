# Deploy runbook — moments engine P0–P3 + Solana launches

Both repos ship together. The free-pull flag only works when Daybreak sends it
AND the backend honors it; migrations `0008`/`0009` must be applied once.

## Order

1. **muse-mirror first** (moment writer + `freePull` settle-skip). No migration needed there.
2. **daybreak second** (everything else). Migrations apply at deploy.

## Env — muse-mirror (prod host)

| Var | Why this deploy needs it | Check |
|---|---|---|
| `MUSE_USDC_TREASURY_ADDRESS` | Pull payments land here. If unset/invalid, ALL paid pulls refuse to quote. | Must be `0x…` (40 hex), non-zero. Matches the Safe you verified. |
| `OPENAI_API_KEY` or Bankr key (`MUSE_LLM_PROVIDER` + `MUSE_LLM_BASE_URL`) | Image forge (existing) AND the new moment writer. | If forge works in prod today, this is already set. |
| `MUSE_STRATEGIST_MODEL` (or `MUSE_BANKR_STRATEGIST_MODEL`) | Model for the moment writer. Forge working does not prove this is set — check it. | Non-empty; reachable via `probeModel` if unsure. |
| `MUSE_DAYBREAK_SECRET` (≥32 chars) | HMAC trust for Daybreak calls, including the free-pull claim. | Must be byte-identical on both repos. |
| `DATABASE_URL` | Backend payment/credit ledger. | Set. |

## Env — daybreak (prod host)

| Var | Why | Check |
|---|---|---|
| `DATABASE_URL` | Pooled Postgres (Supabase pooler OK). Migrations + pulls/comments/circles. | Same DB the migrations target. |
| `MUSE_DAYBREAK_SECRET` | Must match mirror exactly, or every Muse call 401s. | Compare, don't eyeball — diff the two dashboards. |
| `MUSE_ORIGIN` | Must be `https://musemirror.app` (prod), not localhost/preview. | Wrong value = pulls hit the wrong backend. |
| `NEXT_PUBLIC_PRIVY_APP_ID` + `PRIVY_APP_SECRET` | Auth + embedded wallets (EVM and the NEW Solana wallets). | Privy dashboard: Solana enabled for the app. |
| `FINNHUB_API_KEY` | News feed (ticker, circle strips, meme-news chips). | Feed returns items. |
| `BANKR_API_KEY` | Base launches. | User-key mode is current state. |

## Migrations (daybreak only, once, against prod DB)

```bash
npm run db:migrate   # applies drizzle/0008 (kind/pull_group/lane/text/free) + 0009 (agent_moments, free_pull_days)
```

`0008` uses `IF NOT EXISTS` (safe to re-run). `0009` is journal-tracked — run once.
Verify afterwards: `muse_creations` has `kind`/`pull_group`/`moment_lane`/`moment_text`/`free`;
tables `agent_moments` and `free_pull_days` exist. Never run against anything but prod
intentionally — `.env.local` here points at prod Supabase.

## Smoke tests (prod, in order)

1. `GET /api/news/feed` returns items → news + circle strips alive.
2. Sign in → create page → **"Muse writes one"** → moment fills, labeled AI-written. (Proves mirror moment action + key + model.)
3. **Free pull**: Pull button shows "Free pull · 1 today" → pull completes with no wallet payment → button flips to paid. (Proves both halves + migration `free` column.)
4. Second pull same day → wallet payment prompt appears (not free). (Proves 402 path + claim gate.)
5. **Banner**: "Forge the banner" → paid → image lands → download works.
6. **Launch with PFP art** → Bankr preview → launch on Base (real funds — do this one deliberately).
7. **StonkFun tab**: pairs resolve (NVDAx etc.), prepare shows SOL cost. Stop before signing until ready for the real-funds test launch.
8. Groups page: circle strip loads, thread opens inline, comment posts (authed), Your-circle appears with interests set.

## Rollback notes

- Daybreak without mirror: free pulls fail cleanly back to paid (burns the day — acceptable skew cost). Paid pulls unaffected.
- Mirror without Daybreak: harmless (no caller sends the new flags).
- Migration rollback: columns are nullable/defaulted and new tables unread by old code — old build runs fine on the new schema. Do NOT drop tables to "roll back"; ship forward.

## Real-funds tests (owner, after deploy)

- [ ] Free pull E2E in prod (no payment, completes, second pull charges)
- [ ] StonkFun test launch (small SOL in embedded wallet; watch processing → completed; never repay)
- [ ] openlaunch pre-launch list: Safe `node scripts/verify-safe.mjs <addr>`, B20 swap + `collect()` test, aggregator discovery check before announcing
- [ ] Bankr partner revshare email
