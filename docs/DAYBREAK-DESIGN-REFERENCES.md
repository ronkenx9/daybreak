# Daybreak — design direction and agent handoff

Updated 5 September 2026. Implemented in this folder; public brand is Daybreak, folder remains dayworld.

## Direction
Electric blue, white, soft rounded characters, a sunrise horizon, and restrained liquid-glass controls. The supplied reference is the palette and lettering direction: sampled primary #0210EF. Use white as the second brand color, cool off-white for reading surfaces, dark ink for content. DynaPuff supplies a licensed rounded wordmark approximation; system sans supplies readable app text. Do not reproduce the reference's registered trademark symbol or claim ownership of its artwork. Original SVG smiley avatars are included.

## Reference library
These are patterns to adapt, not source code or assets to copy. Public landing pages are not evidence of authenticated product flows.

| Reference | Inspected | What to borrow | Daybreak application |
|---|---|---|---|
| [Family](https://family.co/) | Public homepage visually inspected | Friendly wallet identity, expressive avatars, compact app actions | Profile characters, approachable discovery, useful controls |
| [Family customization](https://family.co/support/customize-your-wallet) | Public support content | Simple personal identity choices | Six avatar choices and a local display name |
| [Copilot Money](https://www.copilot.money/) | Public homepage visually inspected | Clear hierarchy in financial summaries and account rows | Calm holdings page, readable numbers, structured lists |
| [Partiful](https://partiful.com/) | Public homepage and accessibility content | Personality, group identity, playful social invitations | Stock circles, avatar clusters, informal copy |
| [Rainbow](https://rainbow.me/) | Public web content | Approachable crypto vocabulary and colorful personality | Anonymous exploration before any wallet requirement |
| [Public platform disclosure](https://public.com/disclosures/public-platform-disclosure) | Public disclosure text, not current app visuals | Distinguish watching from ownership and disclosed activity | Bookmarks do not become holdings; community samples are labeled |
| [Apple: Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) | Official public design material | Glass provides control hierarchy without compromising content readability | Floating navigation and restrained translucent chrome |
| [Apple materials](https://developer.apple.com/design/human-interface-guidelines/materials) | Official public guidance | Adapt surfaces for legibility and accessibility | Solid-surface preference and opaque detail sheets |
| [DynaPuff source/license](https://github.com/google/fonts/tree/main/ofl/dynapuff) | Font and OFL downloaded | Rounded playful lettering | Local font, license in public/fonts |

The visual reference board is available at /references. Its card illustrations are our own labels, not screenshots of those products.

## Pages and interaction contracts
- `/`: electric-blue sunrise hero, friendly avatar orbit, discovery and community stories, direct open-app calls to action. No signup wall.
- `/app`: discovery collection; company search, category filters, bookmarks, company detail dialog with overview/community tabs. Empty search has a reset action.
- `/app/groups`: three themed circles, stock selector, holder ranking selector, sample avatar profiles and save-circle action. All ranking rows are fixtures. Saving a circle is a local preference, not joining a live network.
- `/app/holdings`: explicit empty real-holdings state, saved discovery collection. Never converts bookmarks or demo receipts into real assets.
- `/app/profile`: nickname, avatar, reduced-motion and solid-surface controls. Local persistence only.
- `/app/world`: preserved room prototype. Its purchase and holdings flows are simulations. Older root share hashes redirect here.
- `/references`: research sources with inspection scope and specific takeaways.

## Design rules for subsequent agents
1. Keep #0210EF and white dominant. Blue is an explicit user preference overriding the earlier warm DAYWORLD plan.
2. Keep the wordmark expressive and interface text quiet. Use existing Identity components rather than inventing a second avatar family.
3. Use glass for navigation or small floating controls. Use solid surfaces for financial numbers, details and purchase review.
4. Desktop navigation sits in the header; mobile uses a bottom dock. Never place viewport-fixed children under a backdrop-filter ancestor without checking its containing block.
5. Stock pages need understandable company identities, selected states, loading/empty/error states and source links. An entertaining interface must still distinguish a company from a specific tokenized instrument.
6. Leaders are opt-in people, not unexplained wallets. Specify ranking unit, time window, data source and freshness before connecting a real leaderboard. Never imply sample quantities represent real holdings or financial performance.
7. Preserve keyboard access, modal Escape/focus restoration, zoom, motion reduction, high-contrast solid surfaces and narrow-screen layout.
8. Do not add trade incentives or rewards for volume while implementing visual gamification. Make discovery and identity the playful parts.

## Implementation map
`app/daybreak.css`: shared styling and responsive rules.
`components/daybreak/Identity.tsx`: wordmark, avatars, stacks.
`components/daybreak/DaybreakApp.tsx`: discovery, circles, holdings and profile interface.
`components/daybreak/LegacyWorld.tsx`: retained room experience.
`components/daybreak/ShareRedirect.tsx`: old shared links.
`lib/web3.ts`: fixture execution; live execution deliberately unavailable.

## Next build sequence
1. Visual tuning: compare hero, discovery, circle and profile pages together at desktop and phone widths. Keep one coherent spacing, type and avatar system. Review with the user before large aesthetic departures.
2. Content: verify company relationships and replace placeholder instrument metadata with individually sourced exact instruments. Define issuer, chain, contract, decimals, supported geography, quote availability and timestamp.
3. Community: define authenticated profiles, explicit public-sharing consent, holder verification, ranking semantics and revocation before connecting the sample UI. Build loading, unavailable and private states.
4. Trading: implement a genuine supported route with real quotes, wallet confirmation, receipt reconciliation and failure handling. Require a qualified instrument and authorized funded participant before claiming live proof. The previous implementation generated a receipt in its live branch; that branch now fails closed.
5. Accessibility and device QA: exercise all navigation and detail dialogs on real phones; test reduced transparency/motion, focus order and zoom. Measure performance after final artwork is chosen.
6. Release: run type-check and build, verify actual financial/network behavior, then deploy only when requested. No live production deployment was performed in this redesign.

## Completion gates
Design gate: all six routes render coherently, phone dock stays at viewport bottom, no horizontal overflow, font and avatars load locally.
Interaction gate: search/filter/reset, bookmark persistence, profile persistence, circle sorting and detail dismissal work.
Data gate: distinguish saved, simulated and verified values everywhere.
Live gate: external execution and independently reconciled ownership proof exist; this gate is not complete.

Commands: `npm run type-check`, `npm run build`, `npm run start -- --hostname 127.0.0.1 --port 3017`.
Pre-redesign backup: `/private/tmp/dayworld-before-daybreak-1788623356.tar.gz` (temporary, not long-term archival storage).
