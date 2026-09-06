# Supabase database setup

Daybreak uses Supabase Postgres as a private application database. Privy establishes the user identity; Daybreak verifies the Privy bearer token in its API routes and resolves it to an internal `users` row. The browser does not access these tables through the Supabase Data API.

## Configure

1. In Supabase, open **Connect** and copy the pooled Postgres connection string.
2. Add it to the uncommitted `.env.local` file as `DATABASE_URL`. Use the transaction pooler connection string; Daybreak configures postgres.js with `prepare: false` for this mode.
3. Keep `PRIVY_APP_SECRET` and `DATABASE_URL` server-only. Neither variable may begin with `NEXT_PUBLIC_`.

```sh
npm run db:preflight
npm run db:migrate
npm run db:verify
```

`db:migrate` applies the versioned Drizzle migrations in `drizzle/`. It is idempotent through Drizzle's migration ledger. `db:verify` checks that all 17 Daybreak tables exist and have Row Level Security enabled.

## What is persisted

The live account release persists an internal Privy-linked user, profile, bookmarks, circle membership and explicit import history. The schema also includes the next Daybreak stages: saved discoveries, wallet links, watchlists, and Bankr operation, quote, launch, pool and fee records.

## Security model

- The server verifies each Privy token, then derives the internal user. Requests never supply a trusted user ID.
- Every `public` Daybreak table has RLS enabled and direct grants are revoked from `anon` and `authenticated`. There are deliberately no public RLS policies because Privy identities are not Supabase Auth identities.
- Next.js API routes use the server-only pooled connection and apply the verified Daybreak user identity to every read/write.
- Account records use database foreign keys, cascade cleanup, optimistic profile versions and unique constraints to stop duplicate saves, memberships, imports and idempotent operations.

## Production check

Run the three database commands in the deployment environment before enabling account persistence. Then test: new social/passkey sign-in, wallet login, save/remove bookmark on two devices, join/leave circle, explicit local import, profile conflict, and account isolation. Keep the external purchase handoff enabled until the separate Bankr execution acceptance work is complete.
