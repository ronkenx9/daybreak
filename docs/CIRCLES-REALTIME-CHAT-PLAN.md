# Circles realtime chat: plan

The circle feed now renders as a group-chat thread (see `CircleDiscoveries.tsx`). This plan
takes it from "list that refreshes" to "live conversation" — new messages push in, presence
and typing show who's around — without breaking the membership gating or the privacy rules.

## What exists today

- Messages are rows in `circle_discoveries` (author, stock subject, note, createdAt). API:
  `GET/POST/DELETE /api/discoveries`, plus `save`/`report`/`block`. `listCircleDiscoveries`
  returns newest-first, **capped at 50**.
- The thread refreshes only on send and React Query's interval/focus refetch — no push.
- Auth is **Privy**, not Supabase Auth. The DB is Supabase Postgres (via Drizzle/postgres.js).
- Membership is server-gated (`/api/circles/membership`); non-members can't read a circle.

## The core decision: how to push

Because the database is already Supabase, **Supabase Realtime is the native, lowest-cost fit**.
The one wrinkle is auth: Privy is our identity, so Supabase RLS `auth.uid()` policies do not
apply. Two ways around it:

- **Broadcast + server-minted token (recommended).** The server (which already knows the user
  and their circles) mints a short-lived Realtime token scoped to the circles the user belongs
  to, and the client subscribes to a **private** channel `circle:{id}`. The POST handler (or a
  Postgres trigger) broadcasts the new message to that channel. Authorization stays where it
  already lives — our server — and no message reaches a non-member.
- **Postgres Changes + RLS.** Subscribe directly to `circle_discoveries` inserts. Cleaner data
  path, but needs RLS keyed to the user, which fights Privy. More plumbing for less control.

Alternatives if we ever outgrow Supabase Realtime: **Ably/Pusher/PartyKit** (managed websockets,
publish from the POST handler, per-connection cost). **SSE from a Next route is a poor fit on
Vercel** (serverless execution limits kill long-lived connections) — don't.

## Phasing

### P0 — Make polling feel live (ship now, zero infra)
- Optimistic append on send (show the message immediately, reconcile on response).
- Drop the refetch interval while the chat is focused; refetch on tab focus + visibilitychange.
- Small "new messages" affordance if the user has scrolled up.
- This alone makes it feel near-live for low traffic and buys time for P1.

### P1 — True push (Supabase Realtime Broadcast)
- Server endpoint mints a Realtime token for the user's circles; client opens the channel.
- On `POST /api/discoveries`, after the insert, broadcast `{type:'message', ...}` to
  `circle:{id}`. Prefer a Postgres trigger so any write path (moderation, future bots) emits.
- Client appends on receive, dedupes against optimistic sends by id, auto-scrolls if at bottom.
- Broadcast `delete`/`hide` too so removed/blocked messages disappear live.

### P2 — Presence (who's here, who's typing)
- Supabase Realtime **Presence** on the same channel: online members + typing state. Ephemeral,
  no DB. Show avatars of who's in the room and a "Mika is typing…" line.

### P3 — History + receipts
- **Pagination:** the 50-row cap breaks for an active chat. Add keyset pagination
  (`before=createdAt`) and infinite scroll upward; keep realtime appending at the bottom.
- **Unread + read receipts:** a `circle_reads` table (userId, circleId, lastReadAt) drives an
  unread badge on the Circles nav and per-circle. Receipts are optional and privacy-sensitive.

## Data model changes

- `circle_discoveries`: add `updated_at` and a soft-delete/`hidden` flag so live removal and
  moderation propagate without hard deletes. Ensure an index on `(circle_id, created_at)`.
- New (P3): `circle_reads(user_id, circle_id, last_read_at)` for unread state.
- Presence and typing are transient — no tables.

## Surfaces to touch

| File | Change |
|---|---|
| `components/daybreak/CircleDiscoveries.tsx` | optimistic send, subscribe to channel, append/dedupe, scroll-anchor, typing UI |
| `app/api/discoveries/route.ts` | broadcast after insert (or add trigger); return the created row |
| `app/api/realtime/token/route.ts` | new — mint a membership-scoped Realtime token |
| `lib/db/schema.ts` + migration | `updated_at`/`hidden`, index, later `circle_reads` |
| `lib/realtime/*` | new — Supabase Realtime client + channel helpers |
| `components/daybreak/CirclesHub.tsx` | unread badges, presence count (P2/P3) |

## Privacy and safety (unchanged rules, extended to the socket)

- A user may only subscribe to circles they are a member of — enforce when minting the token,
  not on the client.
- Never broadcast wallet addresses, balances, or emails — only the same fields the thread
  already shows (display name, avatar, note, stock, timestamp).
- Blocked members' live messages are filtered client-side too, same as the list today.
- Rate-limit sends server-side to keep the socket from being a spam vector.

## Open decisions

1. Broadcast + server token vs Postgres Changes + RLS (recommend the former for Privy).
2. Broadcast from the API handler vs a Postgres trigger (trigger is more robust).
3. Do we need presence/typing for the hackathon demo, or is P0+P1 enough?
4. Read receipts: worth the privacy surface, or stop at an unread badge?
