# Accounts milestone 1 — profile + bookmarks + circle membership (built)

Date 2026-09-06. Stack per owner: Privy + Next.js API routes + Supabase Postgres + Drizzle + React Query. Delivers durable, cross-device profile, bookmarks and real circle membership, with explicit device import. Auth is verified per-request with Privy tokens — no second session system.

## What's built
- **Schema** `lib/db/schema.ts` (+ generated SQL in `drizzle/`): users, profiles (with `version` for optimistic concurrency), bookmarks (one row per save), circles, circle_memberships, migration_imports — plus foundation tables for the next milestone (saved_discoveries, linked_wallets, watchlists, watchlist_items).
- **Data layer** `lib/db/repo.ts`: resolveUser (get-or-create by Privy DID, idempotent), getAccount, updateProfile (version-checked), add/removeBookmark (individual rows), join/leaveCircle (by slug), importLocal (validated, deduped, idempotent per version). `lib/db/circles.ts` seeds the three canonical circles by stable slug.
- **DB client** `lib/db/client.ts`: Drizzle + postgres.js, `prepare:false` for Supabase's pooler, lazy singleton, reads `DATABASE_URL` server-side only.
- **Auth** `lib/account/auth-server.ts`: `requireUser(req)` verifies the `Authorization: Bearer <privy token>` with `@privy-io/server-auth`, resolves the internal user. 503 unconfigured, 401 unauthed. The acting user always comes from the verified token, never the client.
- **Routes**: `GET/PATCH /api/me`, `POST/DELETE /api/bookmarks`, `POST/DELETE /api/circles/membership`, `POST /api/me/import-local`.
- **Client**: `lib/account/api-client.ts` (attaches the Privy access token), `components/daybreak/useAccountData.ts` (React Query read + mutations, refetch on focus + every 60s). Wired into DaybreakApp: when signed in AND the backend is reachable, bookmarks/memberships/profile are sourced from the account and written through on change; otherwise the app stays on localStorage exactly as before. "Import this device" appears once for signed-in users with local saves.

## Design decisions honored
- Individual bookmark/membership rows — a save on one device never rewrites a set and clobbers another device.
- Profile edits carry a version; a stale write returns 409.
- Circle membership stored by slug, never a UI array index.
- Import is explicit and idempotent (once per user+version).
- App identity is separate from the wallet holdings reader.

## Verified
- **Data layer tested against a real local Postgres** (12 checks): idempotent user resolve, individual-record bookmarks with no clobber + dedup, slug memberships + unknown-slug rejection, profile version-conflict rejection, import validate/dedupe/idempotency, and account isolation between users — all pass.
- Offline `drizzle-kit generate` produces the migration; tsc + production build pass; all five routes compile.
- Unconfigured behavior verified: `/api/me` and `/api/bookmarks` return 503 with a clear message; the app runs anonymously (bookmark still persists to localStorage; no console errors).
- NOT verified end-to-end (needs external setup): a real signed-in round trip through Privy token verification against Supabase. The data layer it calls is tested; the routes are thin wrappers.

## To switch it on (owner prerequisites)
1. **Privy** (already integrated client-side): set `NEXT_PUBLIC_PRIVY_APP_ID`, and add server verification secret `PRIVY_APP_SECRET` (from the Privy dashboard). Enable Google/Apple/passkey/wallet + allowed origins.
2. **Supabase**: create a project; put the pooled connection string in `DATABASE_URL` (server env; never client). Run `npx drizzle-kit migrate` (or `push`) to apply `drizzle/` to the database.
3. Restart. Sign in → `/api/me` provisions the user + profile → bookmarks/memberships/profile persist and sync across devices; use "Import this device" once to bring local saves in.

## Not in this milestone
Shared/public watchlists, the circle feed, saved discoveries (memes/news) persistence, verified wallet linking to holdings, account deletion, and instant cross-device push (we refresh on login/focus/interval). Foundation tables exist for several of these.
