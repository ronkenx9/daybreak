# Daybreak — Stocks-first UX and launch plan

> September 8, 2026. Captures the owner's latest direction. The first implementation slice is now in the working tree; it has not been deployed.

**Implementation started:** the stock-led hero is live locally, Community Spotlight is bounded below the stock proposition, and stock detail now returns a real Bankr quote inside Daybreak. Transaction signing remains deliberately gated until an authenticated user can be bound to the correct execution wallet.

## 1. Product hierarchy

**Engineering companion:** [App changes and Bankr implementation](DAYBREAK-APP-IMPLEMENTATION-PLAN.md) maps this UX to existing files, screens, API routes, wallet authority, database changes and delivery order. It records that the Bankr key is already configured locally; application execution wiring is unfinished.

**Daybreak is a stock discovery and trading app on Base. Circles make it personal. Stock-paired community markets and Muse make it distinctive.**

People should understand the stocks proposition before encountering a promotional leaderboard or generation incentive. Daybreak serves people who want to discover and trade supported stocks, even if they never create an image or buy a community coin.

The product has four connected layers:

1. **Stocks:** discover and use supported Coinbase Tokenized Stocks on Base.
2. **Circles:** explore stocks through interests, creators and communities.
3. **Community markets:** discover independently created coins with verified stock-token liquidity pairs.
4. **Creation:** use a community's Muse identity to make original artwork and contribute to its Spotlight visibility.

Creation strengthens the product; it does not replace the stock proposition.

## 2. What this supersedes

This document supersedes the proposed homepage headline “Make memes. Move your coin up” and the proposal to make a token promotion board the entire homepage experience.

It refines, rather than replaces, [Creator Markets Plan](DAYBREAK-CREATOR-MARKETS-PLAN.md) and [UX Flywheel Plan](DAYBREAK-UX-FLYWHEEL-PLAN.md). Keep broader-interest circles, creator distribution, exact stock-pair verification, embedded Muse generation and qualified transaction revenue.

The owner has requested execution over prolonged prelaunch experimentation. Build a focused public release and learn from actual use. A multiweek pilot, creator cohort or research program is not a prerequisite for release. Payment, identity and transaction correctness remain release requirements.

## 3. Positioning and hero

### Proposed hero copy

**Your world. Your stocks.**

Discover tokenized stocks on Base through the interests, creators and communities you follow.

Primary action: **Explore stocks**

Secondary action: **Find your circle**

Supporting description, where space permits:

Explore companies you know, discover stock-paired community coins, and create with people who share your interests.

This is proposed implementation copy, not a claim that the owner approved every word. Use it as the concrete starting point instead of reopening broad positioning research.

### Hero visual

Show a recognizable piece of the actual app: company identities, stock information, an interest circle and expressive community artwork. Keep stocks visually dominant. Use Daybreak's electric blue, existing plush characters, clear type and restrained depth.

A visitor should immediately recognize a stocks product and then notice its social and creative character. Avoid a generic finance terminal, a full-screen meme leaderboard, an abstract animation with no product context, or a collage of unrelated features.

Do not display fabricated prices, holdings, people, returns or activity. Mark illustrative product previews as illustrative; use sourced, timestamped data for live previews.

## 4. Homepage story

### A. Stocks in your world

Introduce supported companies through familiar interests: AI, gaming, entertainment and everyday brands. Show a short reason each company belongs and a direct path to its stock detail.

Stock cards carry recognizable company identity, instrument type, relevant market information and an explicit action. A company logo identifies the company, not necessarily the token issuer.

### B. Find your circle

Show a small set of useful broader-interest circles with their creator or editorial identity, relevant stocks and available contributions. Companies can appear in more than one circle.

Cold-start circles can be editorially curated and labeled. Do not imply mutuals, followers or personalized relevance that have not been established.

### C. Explore the culture around the market

Introduce stock-paired community coins as an additional way to explore the ecosystem.

Suggested copy:

**Stocks have communities, too.**

Discover independent community coins paired with stock tokens on Base.

Show exact verified pairing labels, such as “Paired with [instrument name],” only when the actual market has been verified. A name or meme referencing a company is not proof of a liquidity pair.

The section should feel like part of Daybreak's stock world, not a second landing page for a casino.

### D. Create with your community

Introduce Muse through finished artwork and one simple invitation.

Suggested copy:

**Make something that belongs.**

Create original artwork with your community's look and help it get discovered.

Button: **Create with this community**

Contextual explanation: “Each eligible creation adds a Spotlight point.”

Do not require people to learn the term Capsule before understanding the experience. Capsule remains a creator-facing or explanatory term where useful.

### E. Community Spotlight

A bounded homepage section displays participating communities and their artwork, ranked by eligible recent creation activity. It does not control stock rankings, editorial stories or the entire homepage.

Explain the commercial mechanism clearly: “Ranked by eligible paid and sponsored creations in the last 24 hours.” Link to concise rules. Popularity is not presented as investment quality.

## 5. App navigation and information architecture

Retain existing route/component structure where possible. Product roles remain:

| Destination | User's question | Primary action |
| --- | --- | --- |
| Today / Discover | What interests me, and what is happening? | Open a stock or discovery |
| Explore | Which stocks and communities can I find? | Search/filter typed results |
| Circles | Who shares my interests? | Follow a circle or open a contribution |
| You | What have I saved or chosen to share? | Manage profile, saves and private holdings |

Trading stays contextual to the selected instrument. Creation stays contextual to the selected community. Creator setup can be a secondary entry, **Bring your community**, without competing with Explore stocks in the hero.

Avoid separate top-level tabs for every new capability. Preserve existing Earn/LP work where it fits the current app; LP execution is not a prerequisite for the new creative experience.

## 6. Core journeys

### Journey 1 — discover and trade a stock

Hero or shared stock link → interest/company context → exact stock instrument → quote/review → user signature → reconciled result → return to the originating context.

This path must work independently of community coins and Muse. Include actual route eligibility, wallet, spend, minimum output and fees before signing. If execution is unavailable, clearly show that state rather than a false success or concealed external handoff.

### Journey 2 — explore a stock-paired community

Stock detail or circle → related community market → clear token-versus-stock distinction → exact pairing and liquidity information → optional trade or creation.

A meme-token purchase does not grant direct ownership of its pairing stock. A pool is not automatically redeemable backing or a guaranteed floor. Put a compact explanation close to the market details, not a wall of warnings in the hero.

### Journey 3 — create and contribute

1. Select **Create with this community**.
2. See three scene suggestions and an optional **Your idea** field.
3. See the exact cost or **Sponsored by this community** beside the generation action.
4. Generate with the community's approved visual identity.
5. Reveal the delivered artwork first.
6. Show **You added +1 Spotlight point** only after an eligible job is settled.
7. Show a rank change only when the score actually changes the rank.
8. Offer **Share your creation** and return to the community.

Sharing is optional. A shared link opens the relevant creation/community page directly. New visitors can inspect the related stock and market without first completing onboarding.

### Journey 4 — creator setup

**Bring your community** → connect/create account → identify an existing token or circle → verify its market association → establish the Muse identity → optionally sponsor creations → preview and publish the community page.

Bind token and Capsule/circle records by exact chain and contract identity. Do not let an arbitrary address submission claim official creator status. Existing communities can participate without deploying a duplicate token. Token launching remains a separately qualified flow under the Creator Markets Plan.

## 7. Spotlight v1 rules

Use a simple launch rule rather than a complex reputation system:

- One eligible completed paid or sponsored image generation adds one point.
- A point expires 24 hours after it is earned.
- The score is the sum of currently active points.
- Free internal previews, calibration probes, retries, failed jobs and refunded jobs do not earn points.
- Buying a credit pack alone earns no points; an eligible delivered image does.
- For v1, count one final delivered image per eligible generation job. Multi-output packs require a separately specified rule before they can count.
- Score each generation idempotently. Remove its point if the qualifying payment is refunded.
- Show paid/sponsored influence explicitly. Do not describe the count as unique people or organic popularity.
- Generation points affect Spotlight placement only; they never imply a guaranteed impression count, trading demand or token performance.

Repeated paid creation can contribute under this transparent promotional model. Do not claim one wallet equals one human. Apply basic payment-abuse controls and technical rate limits, but do not block launch on a sophisticated human-reputation system.

Use deterministic tie ordering and pagination. Proposed tie rule: earliest time the current score was reached, then stable community ID. Document the actual implemented rule in the UI's explanation.

The board remains useful visually: artwork leads, stock pairing stays legible, score is secondary, and creation is the primary participation action. Allow unsupported or inappropriate public content to be removed from display without rewriting payment history.

## 8. Visual and interaction principles

- **Stocks first:** first-screen composition, vocabulary and CTA establish stock discovery.
- **Progressive explanation:** reveal community markets, creation and ranking in context.
- **One primary action per state:** explore, inspect, review, create or share.
- **Art with purpose:** characters and original output identify communities and attract attention.
- **Motion with evidence:** animate real navigation, delivered images and score updates; never invent financial or ranking events.
- **Plain terminology:** prefer stock, community, artwork and creation before protocol or Capsule vocabulary.
- **Mobile clarity:** readable prices, thumb-accessible actions, no trapped dock or overflowing transaction sheet.
- **Accessible completion:** keyboard, visible focus, reduced-motion alternatives and text equivalents for score changes.
- **No forced speculation:** following and creating remain valid participation without buying a token.

The image reveal is the emotional moment. Its small, factual Spotlight contribution is the follow-through. Neither displaces the stock identity of the product.

## 9. Revenue and funding

Muse earns through actual paid generation and creator-sponsored allowances. Final prices must cover measured generation, retry, payment, storage and any royalty costs. Display the charge before each paid action.

Daybreak can separately earn verified launch or transaction fees under a qualified provider arrangement. Builder attribution alone is not revenue. Do not promise launch-fee rights or automatic creator-fee funding before the route is implemented and proven.

For the first release, creators can purchase a finite sponsored allowance. Automatic conversion of stock-denominated earnings into generation credits is deferred. No unbounded compute commitment or prepaid points without delivered creation.

## 10. Release scope and sequence

### Step 1 — align the existing homepage

Implement the stocks-first hero, stock discovery and circle hierarchy using existing assets and routes. Introduce community markets and creation below the primary stock proposition. Avoid unrelated redesign work.

### Step 2 — complete the stock journey

Inspect the current implementation and finish one supported stock path with correct eligibility, quote, signing and reconciliation. Preserve issuer distinctions, source freshness and multiplier-aware quantities. Reuse the Bankr/account plans where applicable.

### Step 3 — ship one complete creation loop

Connect one real community identity to Muse. Deliver an image through an actual paid or sponsored job; settle it once; record its point; update Spotlight; share a deep link. Failed delivery must recover or refund honestly.

### Step 4 — open the focused release

Publish only under the owner's execution authorization. Demonstrate stocks → community → creation → real Spotlight update in a concise walkthrough. Stock-paired token launching may follow after provider qualification; do not make custom launch infrastructure a prerequisite for this UX release.

No prolonged prelaunch pilot is required. Capture real usage from release onward and change the product based on observed friction.

## 11. Acceptance criteria

- The first viewport reads as a stock discovery product with Explore stocks as the main action.
- A user can reach a supported stock without entering the creative or meme-token path.
- Community tokens and actual stock instruments cannot be mistaken for one another in cards, search or reviews.
- A generation's price/sponsor is visible before commitment; the finished output is delivered or the failure is resolved explicitly.
- One eligible job earns exactly one point; retry, refund and 24-hour expiry behave correctly.
- Spotlight explains paid/sponsored influence and does not alter stock rankings.
- Sharing reveals no private holdings, account data or Capsule references.
- Desktop, 390px mobile, keyboard and reduced-motion journeys remain usable.
- Existing appropriate checks pass; payment/score idempotency and transaction recovery receive targeted verification.

Check these through implementation review and a working walkthrough rather than delaying release for broad preference research.

## 12. Measurement after release

Record stock detail opens, quote/trade outcomes, circle visits, generation delivery, points earned/expired/reversed and shared-link arrivals. Separate creator self-use, sponsored jobs and independently paid usage when known; do not infer unique humans from wallet count.

The first questions are practical: do visitors understand the stock proposition, do generations deliver reliably, does sharing bring outside visitors, and do those visitors explore stocks or return? Report absolute counts and actual collected contribution. Do not equate paid ranking activity with organic community growth.

## 13. Scope boundaries

This release does not add a Daybreak token, custom AMM, movie-rights tokenization, Netflix-specific dependency, Arc migration, automated public posting, or a complex ranking auction. Arc remains a separate opportunity in the Creator Markets Plan.

The approved hierarchy is the lasting constraint: **stock discovery and trading at the center; circles, community markets and creative participation around it.**
