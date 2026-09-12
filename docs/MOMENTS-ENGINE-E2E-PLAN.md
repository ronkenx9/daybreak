# Moments Engine: end-to-end plan

> Correction 2026-09-11: Lane B is NOT dead companies — it is past memes/scandals/funny
> moments about the live TOKENS stocks, paired per ticker. Dual output is NOT
> meme + token art — it is **PFP (square avatar) + banner (wide header)**, the two
> images a token needs. First pull forges the PFP (free daily applies), second
> pull forges the banner (always paid). Sections below updated to match.

The build plan for the loop: a moment about a stock becomes a meme and a token you can launch,
with the generation framed as a pull you might win. Companion to
[NEWS-VIA-MUSE-AGENT-PLAN.md](./NEWS-VIA-MUSE-AGENT-PLAN.md) (the why); this is the how.

One line: **discovery → community → culture → deploy**, where "culture" is one generate button
that turns any moment into a PFP + banner, and every pull has variance worth chasing.

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

Launch endpoints (locked 2026-09-11, see `lib/launch/endpoints.ts`): Bankr and StonkFun are
user-selectable; monetization comes from Muse pull fees. Our own launcher builds on the
openlaunch builder (`lib/openlaunch/builder.ts`: startTick pricer, split encoder, findSalt;
`lib/openlaunch/safe.ts` + `scripts/verify-safe.mjs` as checklist item zero) and ships once
attention justifies it. StonkFun needs a Solana wallet system first.

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

### Lane B — Blast from the past (shipped as P0)
Past memes, scandals and funny moments about the live stocks, one list per ticker
(`lib/news/nostalgia.ts`: `PAST_MOMENTS` keyed by TOKENS ticker — Rogan 2018 for
TSLA, Antennagate for AAPL, Ballmer chant for MSFT…). No API, no prices.
- Surface as a "Blast from the past · {ticker} lore" rail on the create page, filtered
  to the selected stock; chips fill the moment box as `lane: 'nostalgia'`.
- Nothing invented reads as news: rail label + "throwback" framing in every prompt.

### Lane C — Agent-written moments (build after B)
A Muse/mirror agent writes a punchy moment line per stock, with latitude (not a rigid prompt),
the way the Muse chat works. Decision from the companion doc: prefer a **new** agent (A2) over
loosening the live image worker (A1).
- New endpoint behind the existing proxy, e.g. `POST /api/muse/moment` → agent returns text.
- Cache generated moments per ticker (reuse the `feedStore` accumulation pattern).
- `lane: 'agent'`, clearly labeled as generated (see §7 honesty).

---

## 3. The generate button: PFP + banner

One pull forges the PFP (square 1:1 token avatar); the second pull forges the banner
(wide token-page header) — both from the same moment seed:
1. **PFP** — the coin's visual identity (`pfpArt()` in `lib/muse/prompt.ts`). Free daily pull applies.
2. **Banner** — the token page header (`bannerArt()`, phrased for a wide aspect). Always paid.

Implementation (shipped):
- Two linked forge jobs (`kind: 'pfp' | 'banner'`, `pull_group` = PFP job id). The forge
  endpoint is a single-image contract owned by musemirror, so one pull cannot return
  both — the second pull reuses the saved seed.
- `museCreations` holds `kind`, `pull_group`, `moment_lane`, `moment_text`, `free`.
- The PFP row deep-links into the launch portal as the token avatar; the banner is
  download-for-now (token-page header slot comes later).

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

- `museCreations`: `kind` ('pfp'|'banner'), `pull_group`, `moment_lane`, `moment_text`, `free`. Migrations 0008 + 0009.
- Optional later: `daily_pulls` (userId, day, count) for the free-pull model.
- No change to auth, payments, launches, or circles schemas.

---

## 6. Surfaces to touch

| File | Change |
|---|---|
| `lib/news/nostalgia.ts` | new — curated throwback list |
| `lib/news/provider.ts` | tag lane on FeedItem; optional throwback merge |
| `lib/muse/prompt.ts` | `pfpArt()` + `bannerArt()` alongside `memeMoment()` |
| `components/daybreak/MuseCreate.tsx` | pull UX, PFP + banner outputs, per-stock past rail, labels, history + community rails |
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

- **P0 (shipped):** per-stock past-moments list (Lane B) + pull framing on the create button.
  No migration, no new agent, no engine change.
- **P1 (shipped):** dual output — `pfpArt()` + `bannerArt()`, linked pulls, launch wiring for the PFP. Migrations 0008 + 0009 (also carry P2/P3 columns/tables).
- **P2:** agent moments (Lane C) via a new Muse agent + `/api/muse/moment` + caching + labels.
- **P3:** free daily pull + pull history/collection surfacing; community showcase of good hits.

Live news (Lane A) is already done and rides along from P0.

---

## 9. Open decisions

1. Lane C: new agent (A2, preferred) vs reconfigure the live worker (A1).
2. Pull cost: paid-only vs free daily + paid extra.
3. ~~Dual output: two forge calls or one call returning a pair (latency vs cost).~~ Decided: two linked pulls (forge is single-image; PFP first, banner second).
4. Past moments: hand-curated per ticker to start; agent-expanded later?
5. ~~Do nostalgia names get a fake/fun "ticker" chip, given they aren't in `TOKENS`?~~ Moot: moments pair with live tickers.
