# Daybreak stock-paired thesis markets

Date: 2026-09-18
Status: implemented and verified on 2026-09-18.
Goal: replace the old launcher with one consumer experience where people publish a stock thesis, back it using that exact stock token, discuss developments, and share the market.

## 1. Product contract

The Launch destination becomes **Conviction**. Its headline is **Ideas worth backing.** Its subtitle is **Explore stock theses. Back the ones you believe in.** The primary creation action is **Create a thesis**.

A market pairs one independently tradable thesis token with one canonical stock token on one network. Example: an Apple thesis token / AAPLx pool on Solana. Many theses may concern Apple, and many supported companies may have markets. Each market has one immutable instrument identity and pool; ticker similarity never substitutes for a mint match.

The thesis is a specific argument, such as “Apple’s services business will drive its next phase of growth,” supported by evidence and an explanation of what would change the author's mind. It is not merely a company-branded coin. The token is a position in that thesis market, not Apple equity, a claim on the creator's portfolio, or a settled prediction contract. There is no automatic truth resolution or guaranteed payout when a statement becomes true.

The direct stock-token pair is required. Do not silently fall back to USDC or a holder gate when an instrument is unsupported. The initial implementation uses Solana/Meteora; Base stock discovery, quotes, holdings and Circles remain part of Daybreak. Existing Base launches retain their history and links. A later Base thesis adapter must satisfy the same identity and execution contract before creation is enabled there.

## 2. Evidence and constraints

The [AAPLx compatibility report](dbc-stock-quote-test/REPORT.md) and `scripts/test-dbc-stock-quote.mjs` prove configuration and pool initialization in a non-broadcast mainnet simulation: canonical AAPLx, its token badge, eight quote decimals, `err: null`, 117,714 compute units. This is one representative instrument, not a limit on supported stocks.

It does **not** yet prove swaps, hook-account handling, fee claims, graduation or post-graduation exits. Instrument eligibility must advance through those checks before public trading. A badge alone is insufficient evidence for the entire lifecycle. Reinspect xStocks and PreStocks individually; comments in the existing PreStocks conviction code are historical observations, not a current eligibility registry.

The successful simulation used dynamic supply. The old SDK-produced fixed-supply configuration failed `InvalidTokenSupply` due to the deployed swap-buffer requirement. Production must explicitly choose and disclose a tested supply policy. Start engineering with the proven dynamic configuration, examine actual mint authority/supply behavior, and only use a fixed-supply alternative after its buffer-aware calculation passes. Do not advertise a fixed one-billion cap based on builder inputs alone.

## 3. Current implementation and replacement map

| Current file or surface | Action |
| --- | --- |
| `components/daybreak/DaybreakApp.tsx` | Replace the stacked `LaunchPortal` and `DbcLaunchPanel` render with one Conviction hub; reuse existing shell, title and navigation. |
| `components/daybreak/LaunchPortal.tsx` | Retire generic creation form and provider selector after cutover. Preserve receipt access through a legacy-market view. |
| `components/daybreak/StonkFunLaunch.tsx` | Remove from the creation journey; retain only dependencies actually needed for existing positions. |
| `components/daybreak/DbcLaunchPanel.tsx` | Replace name/symbol/reference-valuation form with thesis-first composition and explicit stock pairing. |
| `components/daybreak/ConvictionMarket.tsx` | Replace the USDC pre-IPO belief-launch widget with relevant thesis markets or an honest unsupported-instrument state. |
| `components/daybreak/PreStocksDiscovery.tsx` | Use company/instrument identity to open matching markets; no automatic launch by company name. |
| `lib/solana/dbc/config.ts` | Replace equity-valuation-derived defaults with versioned thesis-market configuration in explicit stock-token units. |
| `lib/solana/dbc/launch.ts` | Accept server-resolved instrument/config IDs, exact quote mint, decimals and badge; bind creator to authenticated wallet. |
| `lib/solana/dbc/conviction.ts` | Retire implied-company-valuation scaling and automatic “Company Believers” identity. |
| `lib/solana/dbc/trade.ts`, `monitor.ts` | Audit and extend quote units, extensions, market lifecycle and graduated pool routing. |
| `/api/token-launches`, `/api/token-launches/simulate` | Disable new legacy creation at cutover; preserve required historical operation lookup and recovery. |
| `/api/solana/dbc/launch`, `/conviction`, `/submit` | Replace public generic build/relay paths with authenticated, intent-bound market operations. |
| `/api/solana/dbc/quote`, `/pool` | Reuse internals only behind canonical market lookup and exact pool verification. |
| `lib/bankr/launches.ts` | Stop new generic launches through this UI; do not remove Bankr stock trading or other unrelated capabilities. |

Audit all import sites, localized navigation, Guide, Muse creation handoffs, landing links and tests before deleting files. Existing tokens cannot be unlaunched, and stored receipts must not be deleted.

## 4. Visual direction: Daybreak, continued

Build with React, existing CSS, stock marks, profile photos and chart components. **Do not invoke image-to-code or generate a screenshot to translate into UI.** No new visual identity or mandatory artwork generation.

Reuse `app/daybreak.css`: porcelain background `--db-bg`, ink `--db-ink`, muted text `--db-muted`, hairlines `--db-line`, electric blue `--db-blue`, existing Space Grotesk display treatment, app body typography and `db-button`/`db-blue-button` shapes. Use the current dark-theme overrides rather than copied light hex values. Existing dark accent is lighter; check button foreground contrast independently instead of assuming white works on every accent.

Keep generous whitespace, subtle borders, restrained rounded panels and one primary action per surface. A thesis card is text-led with a modest stock mark and creator avatar. Stock discovery keeps its established imagery; do not turn every thesis into another oversized logo card. Avoid dense terminal layouts, neon gradients, nested cards, animated price counters and fake activity. Existing plush characters may appear once in an empty state, not between every section.

Acceptance targets: 4.5:1 normal-text contrast, 3:1 large text and relevant controls, 44px touch targets, keyboard access, visible focus, reduced-motion behavior, no horizontal overflow at 390px. Use the existing dialog stack for focus, Escape and scroll locking.

## 5. Information architecture and hub

Keep the existing number of main navigation destinations. Rename Launch to Conviction, introduce `/app/conviction`, and redirect `/app/launch` while preserving recognized stock context. Public share pages use `/theses/[slug]`; authenticated composition and management stay in the app.

Desktop layout:

```text
Existing Daybreak header / navigation / account controls

Ideas worth backing.                         [Create a thesis]
Explore stock theses. Back the ones you believe in.

[Search theses or companies] [Company] [Sort: Recent activity]
[Explore]  [Following]  [My positions]

Apple · AAPLx / Solana            NVIDIA · NVDAx / Solana
Apple's services business...      Inference demand will...
Creator + published date         Creator + published date
Two-line thesis excerpt          Two-line thesis excerpt
Price in AAPLx · 24h change       Price in NVDAx · 24h change
Small real-history chart          Small real-history chart
Volume · market stage             Volume · market stage
[View thesis]                     [View thesis]
```

Use two columns where text remains comfortable, one on mobile; do not force three narrow cards. Three visible filters maximum, with secondary filters in a popover. Company identity appears first; exact issuer/network is accessible beside the pair label. Label all volume and price units. Default ordering is deterministic recent meaningful activity, with published methodology and spam controls; do not promote self-trading as popularity. Offer newest and liquidity sorts. Suppress percentage changes when the baseline is missing or misleadingly small.

“Following” contains explicitly saved theses, not everyone holding a related stock. “My positions” contains actual wallet positions and honest unavailable states. No seeded holder counts or manufactured launches.

## 6. Thesis detail and backing flow

Desktop: one primary reading column and a roughly 340px trade panel. Mobile: single reading column with a safe-area-aware **Back thesis** action opening a bottom sheet. Keep it above the existing bottom navigation. Selling remains equally discoverable within the trade sheet.

Reading order:

1. Company, exact pair and lifecycle badge.
2. Thesis title, author and publication time; save/share controls.
3. Short argument, sources, optional horizon, and “What would change my mind.”
4. Real market chart with price displayed in the stock token; optional approximate USD display with timestamp.
5. Thesis updates and discussion; relevant company news is a separate context rail.
6. Expandable market details: token/mint, pool, supply policy, fees, creator allocation, LP ownership/locks and receipts.

Trade panel copy:

```text
[Back] [Sell]
You pay                 [0.25] AAPLx
Available               wallet balance
You receive             estimated thesis tokens
Minimum received        protected quote amount
Trading fee             current rate and amount
Network cost            SOL estimate
[Review backing]
```

Review shows exact pair, amount, minimum received, quote expiry, price impact, all known fees and signing wallet. Wallet signature is a distinct final action. Buying exchanges stock tokens into a thesis position: those stock tokens no longer remain as ordinary stock holdings in the user's wallet. Selling quotes stock tokens back, subject to liquidity and fees. Display this once clearly near the first review, without repeated warning banners.

If the user lacks the stock token, offer **Get AAPLx** through the existing instrument purchase experience, preserving the thesis return path. Do not assume the current read-only stock quote review executes a purchase: only offer an executable in-app route after that capability is verified, otherwise use the already supported external purchase route. No implicit bridging or auto-swap during backing. Insufficient SOL has a separate network-fee message.

## 7. Creating a thesis

Use a three-step page, not several provider forms. Preserve draft text across navigation, scoped to account; clear sensitive account caches on identity change.

**Step 1 — Choose your stock.** Search company, choose an eligible exact instrument. Explain disabled options inline (“Trading support is being verified”) with stock discovery still available. Default to the company the user came from. Solana is shown as context, not a technical setup wizard.

**Step 2 — Make your case.** Title, concise summary, full reasoning, evidence URLs, optional time horizon, and what would change your mind. Show similar existing theses to reduce accidental duplicates. Token name/symbol can be suggested from the title and reviewed in market details. Optional existing Muse art stays optional; a stock mark and author identity make a complete card. No paid image generation dependency.

**Step 3 — Review your market.** Show the published thesis preview, selected stock token, versioned launch terms, supply behavior, current fee policy, fee recipients, LP disposition, estimated creation cost and optional initial backing as separately disclosed amounts. Expand technical addresses. Button: **Publish & create market**, followed by the wallet signature. A draft is not a live market until confirmed on-chain and reconciled.

Recommended creator rule: require sign-in plus verified ownership of the signing wallet, creation quota and a fresh positive holding of the exact quote instrument to establish holder authorship. Describe it as a Daybreak publishing requirement; app-level checks do not make the public DBC pool holder-gated. Buyers acquire exposure by paying the quote stock token. Do not assert that every buyer must remain a separately verified Circle member.

At publication, freeze the core thesis, mint/pair, creator, economic terms and metadata hash. Authors append timestamped updates and can mark the argument revised or withdrawn; they cannot rewrite what early buyers backed. A withdrawn thesis still exposes positions and exits. Financial market phase and editorial thesis status are distinct.

## 8. Sharing and organic distribution

The loop is: discover a thesis → back it → share the reasoning → others assess it → discussion and market activity bring the author back. A public page must be readable without signing in, with a clear **Back this thesis** handoff.

Generate share cards from native typography, actual stock marks, thesis title, author and dated metrics using code-rendered OG templates. Provide **Share thesis**, **Copy link**, and an optional owner-authorized **Share my position**. Position amounts stay private by default. No automatic posting to X, Circles or messaging apps.

Early purchasers may benefit if later net buying raises the curve price, but their token count does not automatically increase and later sales can reverse the move. Fees and liquidity affect realizable returns. Use **Backed early** as factual provenance, not a yield promise. Do not call buying “staking,” display APY, or imply accuracy rewards. Creator fee revenue, if enabled, comes from the disclosed trading-fee policy; ordinary holders receive no fee share unless a separate mechanism is explicitly built.

No referral codes or recruitment payouts. No “invite three friends” quests. Measure unique readers and retained participants; exclude obvious wash activity from discovery ranking. Share metadata uses public data only and never leaks wallet or private Circle information.

## 9. Circles, holdings and news integration

Company workspaces gain a restrained **Theses** entry showing a few relevant markets. Existing holder Circles gain a **Theses** subview/filter rather than a new Circle for every token. Public thesis discussion and private Circle discussion have separate access rules and IDs; private posts never flow into public shares.

Reuse company-specific news to help authors publish updates with citations. Clearly separate source headlines from author conclusions; news does not automatically certify or settle a thesis. A user may explicitly share a thesis into a Circle they can access.

Profile gets a compact **Thesis positions** section under the existing portfolio area, with amount, sell estimate when available, cost basis coverage and last refresh time. Keep stock holdings and thesis positions distinct, avoid double-counting exchanged stock tokens, and do not invent P&L where external transfers make basis unknown. Existing private eligibility proofs remain quantity-free; position amounts stay in the user's authenticated portfolio flow.

## 10. Protocol and economic configuration

Create a server-owned instrument eligibility registry keyed by chain + mint, joined to `lib/assets/companies.ts`. Store token program, raw decimals, extensions, badge, hook requirements, issuer, evidence timestamp, config version and lifecycle test results. Recheck mutable pause/freeze/hook state at transaction build. Never accept arbitrary quote mints from a client.

Configure opening price, curve and migration threshold in explicit quote-token units. Do not pass USD amounts directly into a stock-denominated builder or scale a thesis valuation from the company's market cap. If an operator chooses a USD budget for calibration, convert using a sourced, timestamped stock-token price snapshot and freeze the resulting raw quote units in the reviewed configuration. Price unavailable/stale means no new calibrated build.

Use integer/decimal arithmetic for amounts. Distinguish raw on-chain units from displayed units, including ScaledUiAmount behavior and corporate actions. Unit tests must cover eight decimals, large and tiny amounts, rounding and changed display multipliers. Reconcile display conversions against the issuer and token program rather than assuming one displayed token is always one share.

Start with one versioned preset per supported quote instrument. Fee schedule, creator/partner split, mint authorities, allocation, lock duration and migrated LP ownership require economic review before release. Do not carry over the old 5%→1% schedule or 90% creator-withdrawable LP by accident. Recommended starting product policy: no undisclosed creator allocation; permanently lock migrated liquidity where supported and verified; show fee recipients clearly. Model exits, low liquidity, heavy sells, stock-price changes and graduation before freezing numerical terms.

Implement fee claiming separately with authenticated entitlement and exact recipient verification. Migration is a monitored operation with retry/reconciliation, not just a progress bar. After graduation, obtain fresh quotes from the verified DAMM v2 pool with the same token mints; never keep submitting to the old curve. A phase transition invalidates open trade quotes.

## 11. Application architecture

Suggested modules: `lib/theses/{registry,service,operations,quotes,metadata}.ts`, `lib/solana/dbc/*` for protocol adapters, and `components/daybreak/theses/{ThesisHub,ThesisCard,ThesisDetail,ThesisComposer,ThesisTradeSheet,ThesisPosition}.tsx`. Names are proposed, not existing files.

Suggested persistent entities:

| Entity | Required fields / constraints |
| --- | --- |
| thesis | ID/slug, author, company ID, exact instrument ID, immutable published text/hash, timestamps, editorial status, visibility |
| thesis_update | thesis ID, author, text, sources, immutable revision timestamp |
| thesis_market | thesis ID, chain, quote/base mint, config, DBC pool, migrated pool, config version, lifecycle, verified slot; unique chain/pool |
| thesis_operation | owner, wallet, intent, request ID, fingerprint, expected accounts/instructions, quote expiry/block height, signature, status, reconciliation result |
| thesis_follow | user/thesis unique pair |
| thesis_comment | thesis ID and public scope; separate from private Circle comments |

Use existing database conventions, migrations and RLS. Public reads expose published text and public chain metrics; draft/operation reads remain owner-only. Chain truth overrides cached pool state. Raw wallet balances are not copied into public thesis records.

Proposed API contract:

- `GET /api/theses` and `GET /api/theses/[id]`: bounded, paginated public read models with explicit freshness/coverage.
- `POST /api/theses`: authenticated draft creation; `PATCH` edits draft only.
- `POST /api/theses/[id]/preview`: validate instrument, thesis, wallet and terms; simulate and persist immutable build fingerprint.
- `POST /api/theses/[id]/submit`: accept only the signed transaction matching that persisted intent and authenticated wallet.
- `GET /api/thesis-operations/[id]`: recover status after reload, timeout or dropped response.
- `POST /api/theses/[id]/quote`: validated buy/sell quote with exact raw/display amounts, min output, fees, expiry and pool phase.
- `POST /api/theses/[id]/trade`: build against the accepted quote; explicit sign/review then bound submit.
- `POST /api/theses/[id]/updates`, `/follow`, `/comments`: bounded authenticated writes with appropriate ownership/access rules.

Revalidate signer, fee payer, mint, config, recipients, allowed program instructions, amounts and slippage against stored intent. Reject extra instructions even in a fully signed payload. The current generic `/dbc/submit` must not remain a parallel unrestricted entry point for this flow. Reserve creation quota transactionally, use idempotency keys, and recover submitted signatures before permitting rebuilds. Persist public transaction material needed for recovery; ephemeral mint/config private keys need not be retained after partial signing. Expired unsubmitted previews may be rebuilt; uncertain submitted operations must be reconciled first.

## 12. Interaction and failure states

| State | UX behavior |
| --- | --- |
| Signed out | Browse/read/share; backing or creation invokes existing sign-in entry and returns to intent. No duplicate Connect wallet panel. |
| Unsupported stock | Company page remains usable; creation disabled with reason, no USDC fallback. |
| No markets | Short explanation and Create a thesis action; no sample prices pretending to be live. |
| No price history | “Chart available after trading begins”; no decorative financial sparkline. |
| Missing stock token / SOL | Separate amount-needed message and appropriate funding route. |
| Quote expired or changed phase | Refresh and require review of changed terms. |
| Signature rejected | Preserve inputs; return to review. |
| Submitted, response lost | Show checking status; recover signature/intent before another submission. |
| Confirmed, indexer delayed | Show chain receipt with “Market details syncing”; do not offer another creation. |
| Pause/hook/issuer restriction | Explain instrument unavailable; preserve position visibility and actual supported actions. |
| Migration pending | Show phase; disable stale trading route and retry monitored migration. |
| Data unavailable | Label last update; no fabricated zero balances or live prices. |
| Moderated/withdrawn | Explain editorial status; maintain accessible receipt and position exit tools where trading is available. |

## 13. Implementation sequence and acceptance

| Phase | Deliverable | Observable completion |
| --- | --- | --- |
| P0 — Compatibility | Audit all candidate xStocks/PreStocks, badge/extension checks, lifecycle harness; settle supply and fee preset. | Eligibility report per mint; successful buy/sell, claim and graduation evidence for every publicly enabled instrument; unsupported instruments fail closed. |
| P1 — Market foundation | Migrations, immutable thesis model, intent-bound build/submit, metadata, idempotency and reconciler. | Auth spoof, altered mint, extra instruction, replay, expired blockhash and duplicate creation tests pass; interrupted submission recovers one operation. |
| P2 — Product surfaces | Conviction hub, detail, three-step composer, theme-aware cards and responsive trade review. | Desktop and 390px light/dark browser review; keyboard/dialog flow; all failure states exercised; no mocked live metrics. |
| P3 — Execution lifecycle | Back/sell, fee accounting, migration worker and DAMM v2 execution. | Controlled pool buys and sells before/after graduation; minimum output enforced; fee claims reconcile with recipients; issuer extension behavior tested. |
| P4 — Distribution | Public thesis URLs, code-rendered share cards, explicit Circle sharing, profile positions and sourced updates. | Guest link works; login returns to intent; private data absent from public responses/cards; unknown cost basis stays unknown. |
| P5 — Cutover | Retire old entry points, redirect old URLs, preserve receipts, update localized copy/Guide/landing. | New creation has one path; legacy routes cannot create; old positions/receipts remain accessible; production smoke and rollback drill pass. |

P0 begins with AAPLx because it has creation evidence, then expands to every candidate instrument that passes. This is an evidence order, not a one-stock product scope. Local-validator tests may clone mainnet dependencies for lifecycle development; devnet substitutes alone do not prove canonical issuer-token behavior. A small explicitly reviewed live canary records actual signatures and amounts before the public flag is enabled.

Implementation checks: `npm test`, `npm run type-check`, `npm run build`, database migration/RLS verification, and the repository gate checker. Extend acceptance coverage for identity, unit conversion, signed-intent validation, phase switching and privacy. Capture browser evidence for 390px and desktop in both themes. Builds alone do not satisfy trading gates.

## 14. Retirement, rollout and rollback

1. Inventory existing confirmed and pending launches by chain/pool and operation ID. Back up database metadata using the existing operational process.
2. Ship additive schema and internal feature flags with new public creation off. Preserve legacy read models and pending-operation reconciliation.
3. Dry-run legacy links and receipts; map existing launches as legacy, not invented theses. An author may later add a clearly dated thesis without rewriting original launch provenance.
4. Enable the new experience for controlled validation. Freeze old creation atomically at cutover; return a structured retired response from old write endpoints with the new URL. Do not redirect POST bodies into the new API.
5. Redirect `/app/launch` GETs to Conviction and replace all navigation, Muse, Guide, landing and localized calls to action.
6. Remove unused launcher components and mutation helpers only after import/route audits and recovery checks. Preserve required swap/read paths for previously deployed assets.
7. Monitor quote failures, rejection reasons, recovery backlog and migration status. Rollback disables new creation per instrument or globally while preserving history and validated position exits. Never erase confirmed markets or restore the unsafe generic relay as a shortcut.

Landing copy should explain **Choose a stock. Make your case. Back it with the stock token.** Show a native UI example using the same components/styles as the app. Describe tradability, fees and thesis independence accurately; remove “reference valuation” and “IPO-style” claims for thesis tokens. No promise that promotion makes every participant richer.

## 15. Measurement

Reuse installed Vercel Analytics with bounded events: thesis_view, composer_started, preview_ready, signature_requested, market_confirmed, backing_confirmed, sell_confirmed, thesis_shared and circle_opened. Exclude wallet addresses, position amounts and draft text. Deduplicate confirmation events by operation server-side.

Evaluate view→review→confirmed backing, published theses with repeat readers, share-link→engaged reader conversion, returning participants, successful exits, failed/expired quote rate and reconciliation time. Public market counts should describe observable wallets/trades, not claim unique humans. Treat profitability and thesis accuracy as separate from distribution metrics.

## 16. Resources and evidence hierarchy

Use deployed program behavior and current SDK/IDL for implementation, official documentation for intended behavior, and repository tests for Daybreak integration. Pin the tested SDK version and record RPC network, slot and config hash in evidence; the current package range is not a reproducible protocol guarantee.

- [Local AAPLx proof](dbc-stock-quote-test/REPORT.md): exact tested scope and current integration gaps.
- [Meteora DBC overview](https://github.com/MeteoraAg/docs/blob/main/core-products/dbc/what-is-dbc.mdx): configurable quote assets, curves and lifecycle overview.
- [DBC program source](https://github.com/MeteoraAg/dynamic-bonding-curve): deployed-rule comparison, supply checks and migration implementation.
- [DBC SDK](https://github.com/MeteoraAg/dynamic-bonding-curve-sdk): configuration, transaction builders and generated types.
- [DBC account documentation](https://github.com/MeteoraAg/docs/blob/main/developer-guides/dbc/program/accounts.mdx): account identity and lifecycle state.
- [Meteora integration reference](https://github.com/MeteoraAg/meteora-invent/blob/main/skills/meteora/references/dbc.md): engineering navigation; validate against the pinned SDK before use.
- Repository: `lib/assets/companies.ts`, `lib/solana/dbc/*`, `components/daybreak/AccountProvider.tsx`, `components/daybreak/DaybreakApp.tsx`, `app/daybreak.css`, and `docs/DAYBREAK-STOCKS-FIRST-UX-PLAN.md` for canonical identities, integration and existing design direction.

Planning decisions adopted here: one Conviction destination, thesis-first publishing, actual stock-token pairs, no referral payouts, explicit wallet review, immutable original thesis, code-native UI, preservation of legacy exits. Supply/fees/LP terms and per-instrument rollout are engineering release decisions requiring evidence in P0, not assumptions disguised as completed features.
