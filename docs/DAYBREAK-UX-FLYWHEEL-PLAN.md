# Daybreak — images, motion, information

> Product and UX direction · 7 September 2026 · Implementation plan
> Owner principle: **images + motion + information**.
> This document governs the experience. [Bankr integration](BANKR-INTEGRATION-PLAN.md) governs provider qualification and execution. Existing authentication and database implementation must be inspected before making changes; this plan does not assert that proposed features have shipped.

## 1. The product we are making

Daybreak is a social discovery and trading experience for tokenized stocks and related culture on Base. Its Web3 identity is intentional: wallets, tokens, pools, community coins, onchain activity and expressive identities belong here.

Broader-interest circles are the organizing layer. AI, gaming, fashion, entertainment and everyday brands bring people together; stocks, community tokens, news and memes live within those interests. A circle is not limited to a ticker.

The experience combines the human relevance of a social network, the market depth of a token discovery tool, and Daybreak's own electric-blue, plush-character identity. Those influences should become one coherent journey rather than separate products sharing a navigation bar.

**Find your circle. Discover what moves you.**

### What the three elements do

| Element | Job | Daybreak expression |
|---|---|---|
| Images | Attract attention and make interests recognizable | Plush heads, stock charms, editorial posters, company imagery, meme media, circle covers |
| Motion | Explain relationships and preserve context | A discovery opening into its asset, people gathering into a circle, an order progressing to its actual result |
| Information | Turn curiosity into understanding and a possible action | Exact asset identity, social relevance, news, liquidity, price, source, conversation and trading terms |

Each major module needs an intentional relationship between these elements. Do not interpret the formula as mandatory animation and illustration on every row. A transaction review may need stillness and high information clarity; a circle cover can lead with art.

## 2. The flywheel

```text
Recognizable image
    → curiosity
    → motion opens the context
    → useful information explains why it matters
    → save / follow / discuss / join / trade
    → permissioned activity enriches the circle
    → more relevant visual discoveries
```

Trading is one possible action, not the required conclusion of every discovery. Saving an asset, finding a person, understanding a story or joining a circle are successful outcomes.

### The signature journey

1. A person opens Today and sees a visually distinctive AI-circle discovery.
2. A small avatar cluster explains its relevance: two followed people saved this company, if those saves are public.
3. Selecting the card expands its artwork into an asset view while preserving the origin and scroll position.
4. The view reveals the tokenized stock, chart, discussion, company news and related community tokens.
5. Selecting an avatar opens a profile preview with that person's shared discoveries and interests.
6. Selecting Trade opens a Bankr-powered quote/review panel in the same context, where supported.
7. After an actual confirmed transaction, the user returns to the asset and circle. Sharing is a separate, optional choice.

The implementation must support this complete loop before adding more standalone destinations.

## 3. Product boundaries that improve clarity

- A **company** is the organization being discussed.
- A **tokenized stock** is a particular instrument, with issuer/provider, network and contract identity.
- A **community token** is independently created culture or community exposure; it is not automatically equity or company-endorsed.
- A **verified stock pair** means the pool's actual quote/base assets have been checked, not that its name mentions a company.
- A **meme** can be media with no tradable token at all.
- A **save** expresses interest; a **holding** is observed ownership at a stated time; neither is a recommendation.

Use compact badges and expandable detail to express these differences. They should feel like useful product information rather than technical noise.

Headwear and stock charms express taste. They must not imply that the wearer holds the asset. Verified holdings, if voluntarily shared, use a separate indicator.

## 4. Information architecture

| Destination | Main question | Core modules |
|---|---|---|
| Today | What matters in my circles? | Personal discoveries, circle stories, sourced market moves, relevant conversations |
| Explore | What else is worth discovering? | Themes, stocks, community tokens, people, circles and optional market table |
| Circles | Who shares my interests? | Joined circles, shared discoveries, discussion, members and shared watchlists |
| You | What is mine? | Avatar wardrobe, bookmarks, profile, private holdings, connection and visibility settings |

Global search spans people, circles, companies and tokens, with typed results. Trade is contextual to an asset, not a fifth generic destination. Existing route names may be retained to avoid unnecessary churn; this table defines their product roles.

On desktop, use a restrained persistent navigation rail or header and a generous content canvas. On mobile, use the existing floating dock if it remains accessible and does not obscure content. Financial controls must stay reachable without covering source information.

## 5. Today: a composed discovery experience

Today should feel personally relevant before it feels financially dense.

### Composition

1. **Circle pulse:** a compact strip of joined/relevant circles using cover fragments and members, with genuine unread/activity state only.
2. **Lead discovery:** one strong image or poster, a clear headline, one informative supporting line and an explanation of relevance.
3. **Mixed discovery cards:** company story, community-token discovery, public save, circle discussion or meme. Vary composition by content type rather than random card sizes.
4. **Market moment:** a compact sourced market module that leads to deeper inspection.
5. **Continue exploring:** saved items or recently visited circles, private to the user.

Do not fabricate activity, mutual counts or personalized claims for empty accounts. Cold start uses a small interest selection, explicitly editorial picks and suggested circles. Users can skip onboarding and explore.

### Card anatomy

Every discovery card has:

- A recognizable visual with a defined aspect ratio.
- Content type and primary subject.
- One piece of useful information, not an unexplained number.
- Source/time when the content makes a factual claim.
- A relevance explanation where real evidence exists.
- One primary action and a quiet save control.

Example: **AI infrastructure** cover → **NVIDIA** → sourced news headline → “Shared in AI & Builders” → Open. A market card may instead show a timestamped price movement. Never present a company stock-market quote as the executable onchain token price without labeling both.

## 6. The asset view: Daybreak's defining screen

This is the convergence of trading, social context and discovery. Build it early.

### Above the fold

- Asset mark, name and clear type badge.
- Primary token/market identity and price timestamp.
- Compact chart with an accessible range selector.
- Relevant people/circle context based on visible, real activity.
- Save and Trade actions; network identity near trading.

### Below the fold

- **Conversation:** posts and discoveries about the subject.
- **People:** followed users and other opted-in public participants.
- **Company news:** attributed headlines, time and links.
- **Related culture:** memes and community tokens, distinguishable at a glance.
- **Market details:** liquidity, volume, route/pool, contract, provider and freshness, as available.

Use a few content tabs only if they simplify the current amount of information. Avoid putting every section behind a tab before there is enough content to justify it.

### Responsive behavior

Desktop can place the market summary beside the social content. Mobile keeps one readable column and opens trading in a sheet. Deep links must work directly, without requiring a prior feed animation. Browser back restores the original feed and scroll position.

### Related tokens

Show the exact relationship: “Verified pool paired with …”, “Community reference”, or “Editorially related.” Include source and pool freshness. Search matches alone cannot earn a verified badge. Unknown liquidity appears as unavailable, not zero.

## 7. Social connections and circles

### Phase one social graph

Implement Daybreak-native follows, mutual follows, public profiles and explicit visibility for saves. A mutual connection means a relationship in the Daybreak graph unless clearly labeled otherwise.

An X login does not itself import X followers or mutuals. External graph import is a separate capability gate involving available API access, consent and current terms. Until qualified, use an optional X profile link and the native Daybreak graph. Never label imported mutuals that were not actually retrieved.

### Circle page

- Branded cover with a clear interest, rather than a finance-dashboard title strip.
- Member avatar cluster, join state and concise circle description.
- Shared discoveries as the main canvas.
- People and watchlists as secondary views.
- Optional theme-specific market collection.

“Add to my watchlist” copies the selected public item into the user's own saves. It does not silently subscribe them to future changes. Following a watchlist is a separate feature with a separate label. Membership does not expose private bookmarks or holdings.

### Social activity permissions

Default transactions and holdings to private. Let the user deliberately publish a discovery or holding badge, with clear scope and the ability to remove it. Publish no transaction sizes or balances without specific opt-in.

Before user-generated content opens broadly, provide report, mute/block and rate-limit paths. Circle moderation roles must be checked server-side. Public profiles must not reveal email, wallet links or private activity through response payloads.

## 8. Visual identity and asset system

Preserve the user's rebuilt site and its established Daybreak brand. This plan adds a consistent product system; it is not permission to replace the whole aesthetic with a generic terminal.

### Brand anchors

- Electric Daybreak blue and white, with existing tokens as the implementation source of truth.
- Rounded expressive wordmark; readable interface typography for information.
- Plush heads and fluffy headwear with company/stock charms.
- Glass for contextual controls, overlays and transitions.
- Clear surfaces for dense text, charts and transaction review.
- Editorial poster art that expresses a circle's interests.

### Asset families

| Family | Use | Production rule |
|---|---|---|
| Character heads | People, wardrobe, empty states | Reuse six existing looks; consistent framing and transparent edges |
| Circle covers | Discovery and circle identity | Topic-specific composition, strong focal point, readable title outside image |
| Company/token marks | Asset identification | Maintain provenance and correct identity; do not confuse corporate logo with issuer token verification |
| Editorial posters | Lead stories and landing sections | Reuse the blue/plush/chrome vocabulary; avoid decorative text baked into inaccessible art |
| Globe scene | Landing and selected community moments | Express connection; do not imply live global user locations without data |
| Meme media | Cultural discovery | Preserve attribution where available; load safely and distinguish from tradable assets |

### Asset manifest

Create a typed manifest with ID, path, content family, alt text, dimensions, focal point, attribution/license, theme and fallback. Reuse `public/assets/characters` and `public/assets/posters` after inspecting existing contents. Generate missing assets only when a defined screen needs them.

Provide responsive image sizes, reserve aspect ratios to avoid layout shift, and lazy-load offscreen media. Avoid downloading full poster files for tiny avatar chips. Decorative images use empty alternative text; meaningful ones get concise descriptions.

## 9. Motion language

Motion should tell the user where information came from, what changed and where an action went.

| Interaction | Motion intent | Initial design range |
|---|---|---|
| Card → asset | Carry visual identity into detail | 220–360 ms |
| Profile preview | Reveal the person without abandoning the subject | 160–240 ms |
| Circle join/save | Confirm a completed state change | 120–200 ms |
| Trade sheet | Bring action into the current context | 200–300 ms |
| Quote refresh | Show changed terms without hiding them | Short fade/highlight; no bouncing numbers |
| Pending transaction | Indicate unresolved work | Quiet status indicator, no fabricated progress percentage |
| Confirmed receipt | Make completion unmistakable | Restrained reveal after confirmation |

These are starting values for visual testing, not required timing constants. Use the animation system already present unless it cannot support the behavior. Avoid multiple competing motion libraries.

### Rules

- Prefer opacity and transform animation; constrain expensive blur/filter effects.
- No constantly moving trading information or auto-scrolling cards needed for reading.
- Pause decorative motion offscreen and in inactive tabs.
- Respect reduced-motion preferences with immediate or simple fade transitions.
- Never animate a trade to success before provider/onchain confirmation.
- Preserve keyboard focus, dialog semantics and back navigation during transitions.
- Follow existing positioning lessons: a transformed or filtered ancestor must not trap the mobile fixed dock or sheet.
- No full-screen loading animation when partial content can already be useful.

## 10. Information language

Use progressive detail: **recognize → understand → inspect → act**.

| Layer | Content |
|---|---|
| Card | Subject, type, one key fact, relevance |
| Asset summary | Price/chart, social context, source freshness |
| Details | Pool, contract, liquidity, news and relationship provenance |
| Trade review | Exact wallet/assets, amount, fees, minimum output and quote expiry |

Numbers always have units and context. Time-sensitive data has a timestamp or freshness state. Keep `loading`, `empty`, `partial`, `stale`, `unavailable` and `error` distinct. An outage must not look like nobody holds or discusses an asset.

Do not invent sentiment, holder counts, mutual counts or “trending” scores. Initial discovery can be editorial and time-ordered. If ranking is added, document its inputs, availability and relevance explanation; do not equate trading volume with social quality.

## 11. Bankr as the action layer

Follow [BANKR-INTEGRATION-PLAN.md](BANKR-INTEGRATION-PLAN.md) for current qualification gates. This document adds the UX contract; it does not verify new provider capabilities.

### Trading flow

**Asset context → wallet → amount → quote → review → confirm/sign → pending → actual result → return.**

Keep the originating asset and circle visible or recoverable throughout. The review shows exact token/network, selected signing wallet, fees, price impact where supported, minimum output and expiry. Requoting changed terms invalidates the old review. Wallet changes also invalidate it.

If Bankr requires a different wallet/account model from the existing Privy wallet, expose that clearly before the user prepares an order. Never imply that their visible holdings belong to a different signing wallet. Unsupported routes keep a clearly labeled external venue handoff.

Transactions survive refresh through durable operation records. Handle rejected signatures, no route, insufficient funds, expired quotes, provider denial and unknown post-submit outcomes. Unknown outcomes reconcile before resubmission. A success state includes the actual receipt and refreshes holdings from verified results.

### Community token launch

Introduce after trading is qualified. Entry belongs in a relevant company/circle context, not every feed card. Preview artwork, independent-community status, supported quote stock, actual allocation and fee recipients. Simulation and final confirmation are separate states. Publish a token to discovery only after its confirmed identity and pairing are verified.

## 12. Backend work implied by this UX

Inspect and extend existing Privy, Postgres, profile, bookmark and circle services instead of creating duplicate state systems.

Proposed entities, subject to existing-schema review:

- `follows`: follower/followed identity, uniqueness, block filtering.
- `discoveries`: author, subject type/ID, circle, media references, visibility and source.
- `discovery_saves`: user-owned saves with explicit publishing semantics.
- `watchlist_shares`: shared projection separate from private bookmarks.
- `media_assets`: approved media metadata, provenance and variants.
- `activity_events`: permissioned public events; no raw financial payloads.
- `reports` and `blocks`: moderation and personal controls.
- Bankr operations/capabilities from the existing integration plan.

The feed API returns a typed card, relevance explanation, allowed actions, media metadata and source freshness. It must filter visibility before pagination and counts. Derive identity server-side. Cross-device persistence is expected; local optimistic state rolls back visibly on failure.

Do not leak private graph information through mutual counts or private saves through aggregate activity. Query authorization applies to detail pages, search, feed, counts and media access alike.

## 13. Landing page story

The landing introduces the same product loop as the app.

1. **Hero:** Daybreak name, a confident plush/globe composition and “Find your circle.” Primary action opens discovery.
2. **People make discovery personal:** image-led circle examples with an honest product preview.
3. **Follow the connection:** a short motion sequence from person to interest to stock/community token.
4. **Go deeper when it matters:** preview the asset view's market and information depth.
5. **Act in the moment:** show the contextual trade panel, with availability language matching the implemented integration.
6. **Make it yours:** avatar/headwear wardrobe and public-interest expression.
7. **Poster footer:** existing Daybreak art language, clear real navigation and a final discovery action.

Use actual app states for interactive previews where possible. Label concept/demo content and upcoming capabilities. Avoid repeating the same blue poster across every section; alternate image-led, information-led and quiet sections for rhythm.

## 14. Delivery sequence

| Phase | Deliverable | Acceptance gate |
|---|---|---|
| 0 — Inspect | Route/component/data inventory and screenshots of current design | Existing owner design, backend and Bankr gaps documented |
| 1 — Vertical UX | Today card → asset → profile/circle preview → back | Real navigation, preserved context, responsive layout; fixtures labeled |
| 2 — Visual system | Asset manifest, typed cards, covers and motion primitives | Reuses current art; reduced motion and accessible focus pass |
| 3 — Social relevance | Native follows, public discoveries and visibility-aware context | No fabricated mutuals; private data isolation and cross-device persistence verified |
| 4 — Live information | Existing stock/news/pool adapters integrated into new views | Exact identity, source/time and failure states present |
| 5 — Bankr action | Qualified quote/review/status journey | Wallet proof, immutable review and reconciliation; live verification separately authorized |
| 6 — Landing | Product narrative and poster footer using the same system | Claims match implemented features; no broken navigation |
| 7 — Refine | Usability, performance and visual pass | Complete journey tested on desktop/mobile and with reduced motion |

Provider qualification can proceed while the vertical UX is built. Do not wait for Bankr credentials to complete navigation, image composition, evidence states or paper/fixture interactions. Do not treat those fixtures as live integration.

### Initial scope cuts

Keep one excellent Today composition, one asset view, one circle view, one profile preview and one trading panel. Defer imported X graph, live global activity globe, advanced chart drawing, public holder rankings, automated trading, launch marketplace and complex personalized ranking until the core loop works.

## 15. Validation and success measures

### Usability questions

- Can someone tell why a discovery is relevant?
- Can they distinguish a stock token, community token and meme?
- Can they move from a person to an asset to a circle and return without losing their place?
- Does imagery help them recognize the subject?
- Does motion clarify the transition or interrupt reading?
- Can they find deeper market information when wanted?
- Before signing, can they identify the wallet, asset, spend and expected minimum output?

### Technical acceptance

- Desktop and 390px mobile: no overflow, trapped dock or obscured controls.
- Keyboard and reduced motion: complete journey remains usable.
- Slow network: reserved image geometry, useful partial content, explicit stale data.
- Account switch: no previous user's private data or quote remains actionable.
- Share visibility: private saves/holdings never surface through feed or counts.
- Trade refresh/retry: no duplicate operations or manufactured success.
- Images have appropriate sizing, attribution and accessible text.
- Run existing type checks, relevant regression tests and production build; inspect current package scripts first.

Measure discovery opens, meaningful saves, circle joins, return visits and completion of the core journey. Track evidence/detail opens and successful recovery from errors. For trading, measure quote clarity and completed/reconciled operations rather than maximizing trading volume. Establish baseline metrics before setting numeric growth targets.

## 16. Implementation handoff

> Read this document, the Bankr integration plan and current repository state. Preserve the owner's established Daybreak brand. Build the signature discovery → asset → person/circle → trade → return journey first. Use images to create recognition, motion to explain relationships and information to support understanding. Reuse existing plush heads, posters, authentication, database and market adapters. Implement native Daybreak social relationships before assuming any X graph access. Keep public interests distinct from private holdings and exact stock tokens distinct from community tokens. Qualify Bankr's wallet and route support; label fixture flows and keep actual execution tied to explicit confirmation and verified results. Record implemented versus planned behavior, screenshots, checks and the next unblocked task at each handoff.

**Design acceptance:** it should feel unmistakably Daybreak before a user reads the logo, and remain understandable when all motion is turned off.
