# News without an API: Muse agent + historical angle

Status: thinking / decision doc. Captures the direction from the 2026-09-11 talk-out-loud.

## The reframe

We just wired Finnhub for the live ticker. But the real question is: do we even need an
external news API? The feed exists to give people a **moment** to turn into a meme. A moment
does not have to be today's headline. It can be manufactured or resurfaced.

Two ideas on the table:

### Idea A — Muse agent generates the moments (no news API)
Instead of pulling headlines, let our own Muse / mirror agent on the VPS produce the
"news moment" text (and optionally the image) for each stock. The agent already knows the
company and the vibe; it can write a punchy, meme-ready line on its own.

Why this fits us: the reason Muse works well in the Muse chat is not that we script it
tightly. It's that it carries good baked-in rules (design, tone) and we give it latitude.
Same principle here: give the agent room, not a rigid task, and it produces better moments
than a news parser ever would.

### Idea B — Historical / forgotten names
Lean into nostalgia. Resurface old, defunct, or renamed companies people forgot (the "old
past sheet" names) as meme fodder. This is culture bait, not market data. Could be a curated
list to start (no API), and later an agent that knows the history.

These are not exclusive. Live (Finnhub) + AI-generated moments + a nostalgia lane can all
feed the same "make a meme from this" button.

## The VPS agent question

The current VPS agent (okx-a2a worker on 198.96.95.46, ASP #7222) calls the musemirror.app
image engine. It is not set up to freely generate news/moment text. So to do Idea A we either:

- **A1. Reconfigure the existing agent** to loosen its restrictions and let it generate
  moment text + image with latitude (like the Muse chat has). Less work, but we change a
  live worker.
- **A2. Spin up a new agent** dedicated to "moments" so we don't touch the working image
  pipeline. Cleaner separation, more setup.

Open doubt from the talk: the current agent probably **cannot** do what a free-form moment
generator needs without one of the above. Confirm before building.

## Tradeoffs

| Path | API key? | Reliability | Effort | Feel |
|---|---|---|---|---|
| Finnhub (shipped) | yes | good, real | done | real headlines |
| Muse agent moments (A) | no | we own it | medium (agent reconfig) | generated, on-brand |
| Historical names (B) | no (curated) / maybe later | fully controlled | low to start | nostalgia / culture |

## Recommendation (draft)

1. Keep Finnhub as the "real news" lane since it's already wired and free.
2. Add a **generated-moments lane** via the Muse agent (prefer A2, a new agent, so the image
   pipeline stays untouched) with deliberate latitude, not scripted prompts.
3. Ship the **historical-names lane** first as a small curated list — cheapest, no API, and
   it proves the nostalgia angle before we invest agent time.
4. All three feed the same `/app/create?stock=&moment=` button.

## The generate button covers token media too

The same generate action should not stop at memes. It should also produce the **coin/token
media** — the visual identity for the token you launch. One button, one engine, two outputs:
a shareable meme and the token's artwork. The moment (news, generated, or nostalgia) seeds
both, so the coin and its meme come from the same beat.

## The lottery / gacha mechanic

Generation has variance, and that variance is a feature, not a bug. You ask for a meme and
sometimes you hit a great one — a good old-format meme with good art. Frame the pull like a
lottery: you pull the lever, and it might hit. That "will it land" tension makes people pull
again, and the good hits are the ones that get shared and launched.

- Lean into the randomness instead of hiding it. Each generate is a pull.
- Surface the hit: when something lands, make it obvious and easy to launch/share.
- Keeps engagement and repeat use high. It is the dodgy-but-fun loop that fits meme culture.
- Open: does each pull cost (ties back to the paid Muse flow), or is there a free daily pull
  with paid extra pulls? Cost model shapes how gacha it feels.

## Open questions

- A1 vs A2: reconfigure the live agent, or stand up a new one?
- Where does the historical names list come from to start (hand-curated vs agent)?
- Does a generated "moment" need an image, or is text enough for the ticker?
- How do we label AI-generated vs real headlines in the UI so it stays honest?
