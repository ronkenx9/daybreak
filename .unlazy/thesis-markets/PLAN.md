# Plan: Daybreak stock-paired thesis markets

Scope: thesis-markets
Depth: tree 3
Mode: sequential fallback

## Contract

- Interfaces: canonical instrument registry -> DBC builder -> persistent thesis operation -> authenticated APIs -> Conviction UI.
- Ownership: each leaf ledger owns a disjoint set; shared integration files belong to the cutover leaf.
- Dependencies: protocol first, persistence second, product UI third, cutover/integration last.
- Host launch mode: sequential fallback; no subagents requested.
- Toolchain: Node 22, npm, TypeScript, zsh, repository root `/Users/gadgetplug/Documents/vibecoding/dayworld`.
- Conventions: exact mint identity; integer raw amounts; no USDC fallback; no fabricated market data; user signs every transaction.
- Manual review: primary agent reviews protocol boundaries, public/private data, light/dark desktop/mobile UX and legacy preservation.

## Current contract inventory

Contract revision: 1.

| ID | Required outcome or constraint | Owner | Observing gate or manual review | Disposition | Revision |
|---|---|---|---|---|---|
| C1 | Replace generic/USDC creation with canonical stock-token quoted DBC markets | leaf-1.1.1 | leaf-1.1.1:G1-G4 | ACTIVE | 1 |
| C2 | Persist immutable theses, markets and intent-bound operations | leaf-1.1.2 | leaf-1.1.2:G1-G4 | ACTIVE | 1 |
| C3 | Deliver Daybreak-native hub, composer, detail and backing UX | leaf-1.2.1 | leaf-1.2.1:G1-G4 | ACTIVE | 1 |
| C4 | Build buy/sell transactions and lifecycle-aware quotes | leaf-1.2.2 | leaf-1.2.2:G1-G4 | ACTIVE | 1 |
| C5 | Retire old launcher entry points while preserving legacy receipts/exits | leaf-1.3.1 | leaf-1.3.1:G1-G4 | ACTIVE | 1 |
| C6 | No image-to-code; reuse current Daybreak theme and responsive dialog system | leaf-1.2.1 | manual UX review | ACTIVE | 1 |
| C7 | End-to-end verification including live-compatible simulation evidence and regression checks | node-1 | root:G1-G5 | ACTIVE | 1 |

## Tree

- 1 End-to-end thesis markets .............. GATES.md
  - 1.1 Foundation .......................... gates/node-1.1.md
    - 1.1.1 Stock-quoted protocol ........... gates/leaf-1.1.1.md
    - 1.1.2 Persistence and APIs ............ gates/leaf-1.1.2.md
  - 1.2 Product ............................. gates/node-1.2.md
    - 1.2.1 Conviction UX ................... gates/leaf-1.2.1.md
    - 1.2.2 Trading lifecycle ............... gates/leaf-1.2.2.md
  - 1.3 Cutover ............................. gates/node-1.3.md
    - 1.3.1 Launcher retirement/integration . gates/leaf-1.3.1.md

## Leaf dispatch table

| Leaf | Owns | Needs | Tier | Planned wave | State |
|---|---|---|---|---|---|
| 1.1.1 | lib/theses/instruments.ts, lib/solana/dbc/config.ts, lib/solana/dbc/launch.ts, scripts/verify-thesis-protocol.mjs | - | judgment | 1 | VERIFIED |
| 1.1.2 | lib/db/schema.ts, lib/db/repo-theses.ts, drizzle/0017_thesis_markets.sql, app/api/theses/**, lib/theses/model.ts, scripts/verify-thesis-persistence.mjs | 1.1.1 | judgment | 2 | VERIFIED |
| 1.2.1 | components/daybreak/theses/**, app/theses/**, app/daybreak.css | 1.1.2 | judgment | 3 | VERIFIED |
| 1.2.2 | lib/solana/dbc/trade.ts, app/api/theses/[id]/quote/**, app/api/theses/[id]/trade/**, scripts/verify-thesis-trading.mjs, lib/db/schema.ts, lib/db/repo-theses.ts, drizzle/0017_thesis_markets.sql | 1.1.2 | judgment | 3 | VERIFIED |
| 1.3.1 | components/daybreak/DaybreakApp.tsx, components/daybreak/PreStocksDiscovery.tsx, components/daybreak/ConvictionMarket.tsx, components/daybreak/LaunchPortal.tsx, components/daybreak/DbcLaunchPanel.tsx, app/api/solana/dbc/**, app/api/token-launches/**, components/daybreak/LocaleProvider.tsx, components/daybreak/WelcomeGuide.tsx, scripts/audit-core.cjs | 1.2.1, 1.2.2 | judgment | 4 | VERIFIED |

## Status log

See `.unlazy/thesis-markets/status.log`.
