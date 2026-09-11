# Moments Engine: end-to-end plan

The build plan for the loop: a moment about a stock becomes a meme and a token you can launch,
with the generation framed as a pull you might win. Companion to
[NEWS-VIA-MUSE-AGENT-PLAN.md](./NEWS-VIA-MUSE-AGENT-PLAN.md) (the why); this is the how.

One line: **discovery → community → culture → deploy**, where "culture" is one generate button
that turns any moment into a meme + token art, and every pull has variance worth chasing.

---

## 1. Architecture

```
MOMENT SOURCES            GENERATE (pull)                 OUTPUTS               DEPLOY
─────────────            ───────────────                 ───────              ──────
Finnhub live news   ┐                                ┌─ meme image      ┐
Agent-written moment├─▶ /app/create?stock=&moment= ─▶ ┤                   ├─▶ Launch (Bankr)
Nostalgia names     ┘    Muse engine (musemirror)   └─ token/coin art   ┘    on Base
                          + gacha result surface
```

Three moment lanes feed one create surface. The create surface calls the existing Muse engine
(`lib/muse/client.ts` → `musemirror.app/api/integrations/daybreak`, proxied by
`app/api/muse/[...path]/route.ts`). It returns a meme and the token art from the same seed. A
good pull flows straight into the launch portal.

Nothing about payments, auth, or the launch path changes. This plan adds moment sources, a
second output (token art), and a pull/result UX on top of what already exists.

---

## 2. Moment lanes

A **moment** is the seed text (a headline, an agent line, or a nostalgia name) plus its stock.
Unify all three behind one shape so the create page does not care where a moment came from.

```ts
interface Moment { ticker: string; text: string; lane: 'news' | 'agent' | 'nostalgia'; source?: string; seenAt?: string }
```

### Lane A — Live news (shipped)
Finnhub via `lib/news/provider.ts`. Already feeds the ticker and the create page's
"Meme a news moment" strip. `lane: 'news'`. No further work beyond the key.

### Lane B — Nostalgia names (build first, cheapest)
A curated list of famous dead/renamed companies as culture bait. No API.
- New file `lib/news/nostalgia.ts`: `[{ name, ticker, blurb }]` (Blockbuster, Nokia, Kodak,
  Compaq, Yahoo, Enron, Pets.com, MySpace, Sega hardware, Palm...).
- These are not in `TOKENS`, so they can't open a real stock workspace. Route them straight to
  create as `lane: 'nostalgia'`, ticker = the historic symbol, text = a nostalgia prompt.
- Surface as a "Throwback" rail on the create page and optionally a ticker segment tagged
  differently from live news.

### Lane C — Agent-written moments (build after B)
A Muse/mirror agent writes a punchy moment line per stock, with latitude (not a rigid prompt),
the way the Muse chat works. Decision from the companion doc: prefer a **new** agent (A2) over
loosening the live image worker (A1).
- New endpoint behind the existing proxy, e.g. `POST /api/muse/moment` → agent returns text.
- Cache generated moments per ticker (reuse the `feedStore` accumulation pattern).
- `lane: 'agent'`, clearly labeled as generated (see §7 honesty).

---

## 3. The generate button: meme + token art

Today the create flow makes one image. Extend it to two outputs from the same moment:
1. **Meme** — shareable, meme-format (the current `memeMoment()` prompt in `lib/muse/prompt.ts`).
2. **Token art** — the coin's visual identity, square, clean enough to be a token avatar.

Implementation:
- Add `tokenArt(name, moment)` alongside `memeMoment()` in `lib/muse/prompt.ts`.
- One pull requests both (two forge calls, or one call returning a pair) via the Muse proxy.
- Store both on the creation. Extend `museCreations`: add `kind` or a second image column
  (`meme_image`, `token_image`) — migration required (Drizzle). Keep `image` as the primary
  for back-compat.
- The launch portal already accepts a Muse art URL (`db-launch-art-preview`); wire the token
  art through as the launch image so a good pull → launch is one tap.

Aspect note: the forge route derives aspect from the prompt/reference
(`muse-mirror/app/api/capsules/[id]/forge/route.ts`), so phrase `tokenArt()` to yield 1:1 and
`memeMoment()` to yield the meme format.

---

## 4. The gacha pull

Frame each generate as a pull with visible variance.
- **Pull UX:** the generate button becomes "Pull" language; a short suspense state; the result
  reveals with weight when it lands. Reuse `reduced`/prefers-reduced-motion to keep it calm for
  those who opt out.
- **Hit surfacing:** when a result is good, make the share + launch actions the loud next step.
  Let the user keep or discard; discard frees them to pull again.
- **Variance is real** (the model already varies per generation); we are exposing it, not
  faking randomness.
- **History:** show the user's recent pulls (from `museCreations`) so the "collection" feeling
  builds. `public`/`eligible` flags already exist for surfacing good ones to the community.

### Cost model (decides how gacha it feels) — open
- Option 1: every pull is paid (current Muse paid flow, USDC/USDT/ETH). Cleanest, most "lottery."
- Option 2: one free daily pull, paid extra pulls. More engagement, needs a per-user daily
  counter (new column or a `pulls` table).
- Recommendation: ship paid pulls first (already built), add the free daily pull as a growth
  lever later.

---

## 5. Data model changes

- `museCreations`: add `token_image text`, `moment_lane text`, `moment_text text`. Migration.
- Optional later: `daily_pulls` (userId, day, count) for the free-pull model.
- No change to auth, payments, launches, or circles schemas.

---

## 6. Surfaces to touch

| File | Change |
|---|---|
| `lib/news/nostalgia.ts` | new — curated throwback list |
| `lib/news/provider.ts` | tag lane on FeedItem; optional throwback merge |
| `lib/muse/prompt.ts` | add `tokenArt()`; keep `memeMoment()` |
| `components/daybreak/MuseCreate.tsx` | pull UX, dual output (meme + token art), throwback rail, labels |
| `app/api/muse/[...path]/route.ts` | pass through dual-output request |
| `app/api/muse/moment` | new — agent moment endpoint (Lane C) |
| `lib/db/schema.ts` + migration | new muse columns |
| `components/daybreak/LaunchPortal.tsx` | accept token art from a pull as launch image |
| `components/daybreak/NewsTicker.tsx` | optional throwback segment, lane labels |

---

## 7. Honesty and labeling

- Real headlines (Lane A) look like news. Generated moments (Lane C) and nostalgia (Lane B)
  must be visibly tagged so nothing invented reads as a real market headline.
- Token art and memes are user-generated; keep the existing consent copy on create.
- No fabricated prices or holdings anywhere near a moment.

---

## 8. Phasing

- **P0 (cheapest proof):** nostalgia list (Lane B) + pull framing on the existing create button.
  No migration, no new agent, no engine change. Ships the feel.
- **P1:** dual output — add `tokenArt()` + store token art + wire it into launch. One migration.
- **P2:** agent moments (Lane C) via a new Muse agent + `/api/muse/moment` + caching + labels.
- **P3:** free daily pull + pull history/collection surfacing; community showcase of good hits.

Live news (Lane A) is already done and rides along from P0.

---

## 9. Open decisions

1. Lane C: new agent (A2, preferred) vs reconfigure the live worker (A1).
2. Pull cost: paid-only vs free daily + paid extra.
3. Dual output: two forge calls or one call returning a pair (latency vs cost).
4. Nostalgia list: hand-curated to start; agent-expanded later?
5. Do nostalgia names get a fake/fun "ticker" chip, given they aren't in `TOKENS`?
