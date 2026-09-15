# $DAYC × Daybreak Circles — growth execution plan

Status: execution plan, not implemented. Owner-authored strategy (2026-09-15), grounded here
in the actual codebase so each step names real files, real gates, and real dependencies.

This is the **traction track**. It runs alongside the **foundations track**
(`docs/…` stock-infra plan: price feeds, corporate actions, compliance, analytics, Solana).
Traction gives $DAYC utility beyond speculation; foundations make the product true. The daily
ship log (Step 7) is where foundation work becomes public proof.

Principle: shift from price talk to shipped onchain utility. Every step is something a holder
can *do* in the product, verifiable onchain. No fabricated metrics, no promised yield.

What already exists to build on:
- `lib/base/daybreak-token.ts` — DAYC address/decimals; `app/api/daybreak-token/route.ts` already
  reads a wallet's DAYC `balanceOf`. Gating and sinks reuse this.
- Circles: `lib/db/schema.ts` (`circles`, `circleMemberships`, `holdingEligibilities`),
  `components/daybreak/CirclesHub.tsx`, `app/api/circles/*`, `app/api/holdings/sync` (wallet-owning
  eligibility pattern to copy).
- Wallet signing: `AccountProvider.payCreationTransfer({to,value,data})` (Privy embedded EVM wallet;
  user signs) — extend for a DAYC transfer to a sink.
- Fees: `feeObservations` table + Bankr launch dashboard.
- `app/api/stats` + `/stats` dashboard for public onchain proof.

---

## Phase 1 — Product integration (next 24–48h)

### Step 1 — Token-gate a premium tier on daybreakcircles.lol
Give DAYC immediate buying utility.

- Wallet connect already exists (Privy + wagmi `ConnectButton`). No new connect needed.
- New server check `lib/base/dayc-gate.ts` + `app/api/dayc/eligibility` (POST `{address}`):
  reuse `requireUserOwningWallet` (so the wallet is proven to belong to the account, like
  `/api/holdings/sync`), read DAYC `balanceOf`, return `{ tier, balance }` where
  `tier = balance >= THRESHOLD ? 'member' : 'none'`.
- Threshold: **500,000 DAYC** (≈ $0.24 at $4.8e-7; keep it a config constant so it can move
  with price). Store the derived tier the same private, binary way circle eligibility is stored —
  never expose balance size to other users.
- Gate: unlock a **special "holder" badge** and **priority circle creation / custom circle art**.
  Design note: gate *premium* capability, not the core ability to explore or join — keep the
  funnel open so non-holders still convert.

Gate P1:
- CHECK: a wallet holding ≥ threshold returns `tier:'member'`; a wallet below returns `'none'`.
- CHECK: the badge/premium unlock is server-enforced, not client-only.
- EXPECT: no other member can read your DAYC balance; only the binary tier is surfaced.

### Step 2 — Burn / sink: pay DAYC to pin a circle
Create deflationary pressure tied to a real feature.

- Add `pinnedUntil timestamptz` to `circles` (migration). A pinned circle sorts to the top of the
  homepage/circle list for its window.
- Flow: user signs a DAYC transfer to a **sink** (dead address `0x…dEaD` for a true burn, or a
  treasury wallet — pick one and document it). Extend `payCreationTransfer` to allow an ERC-20
  transfer to the fixed sink address only (whitelist the sink `to` + `0xa9059cbb` transfer
  calldata, exactly like the existing USDC guard).
- Server `app/api/circles/pin` verifies the tx on-chain (recipient = sink, token = DAYC, amount ≥
  price, `UNIQUE(tx_hash)` anti-replay, confirmations) then sets `pinnedUntil`. Same verification
  shape as the Muse payment settle.
- Price the pin in DAYC (config); a burn sink makes it visibly deflationary and the amount is
  provable onchain.

Gate P2:
- CHECK: pinning requires a confirmed DAYC transfer to the sink; a replayed tx_hash is rejected.
- CHECK: pin expires at `pinnedUntil` and the circle falls back in the ordering.
- EXPECT: the sink address is fixed and whitelisted; no other recipient can be paid via this path.
- EXPECT: burn is labeled as irreversible before the user signs (consent copy).

---

## Phase 2 — Base-native distribution (days 3–5)

Twitter conversion for micro-caps is near zero; Base volume lives on Farcaster/Warpcast.

### Step 3 — Move primary distribution to Farcaster
- Create the Farcaster account; post product updates in `/base`, `/build`, and a Daybreak channel.
- Build a **Farcaster Frame / mini-app** (Next route `app/frames/*` returning frame meta + image):
  - "Trending circles" frame: renders the top circles (reuse circle list data) as a frame image
    with a button to open the app.
  - "Check my $DAYC" frame: given the viewer's connected address (frame message), call the existing
    `/api/daybreak-token?address=` and render balance + price.
- Frames are server-rendered images + POST handlers; no new wallet infra.

### Step 4 — Frame-based onboarding incentive
- Frame where any DAYC holder can **claim a circle invite / holder badge**: verify holding via the
  Step 1 eligibility check, then grant the badge / a genesis-circle invite.
- Distribute the frame link across active Base builder channels.

Gate (Phase 2):
- CHECK: the balance frame returns the real onchain DAYC balance for the frame's verified address.
- CHECK: a non-holder cannot claim the holder-gated badge/invite.
- EXPECT: frame images render without leaking any private user data; addresses come from the signed
  frame message, never guessed.

---

## Phase 3 — Community activation (days 6–8)

### Step 5 — Mobilize the existing holders (~166)
- Export top holder addresses from BaseScan (token holders page / API).
- Create a **Genesis circle** gated to DAYC holders (Step 1 eligibility). Seed it and invite the
  top holders into product testing + feature voting — passive buyers become advocates.
- Feature voting can start as a simple circle poll (circle message thread) before any dedicated
  voting schema.

### Step 6 — Transparent fee recycling
- Read accrued Bankr creator fees periodically (the `feeObservations` table already models this;
  cross-check the Bankr launch dashboard).
- Publish a **defined policy**: e.g. "X% of received creator fees market-buy $DAYC or reward top
  circle contributors," with the onchain tx as proof each time.
- Honesty gate: announce and act on **actually received** fees only, with the tx hash. Never
  promise a yield, a buyback amount before fees exist, or a price outcome.

Gate (Phase 3):
- CHECK: the genesis circle is holder-gated and its membership matches verified eligibility.
- EXPECT: every fee-recycling claim links a real onchain tx; no forward-looking yield promise.

---

## Phase 4 — Routine flywheel (ongoing)

### Step 7 — Daily ship log
- One technical/product update per day showing real UI/code progress (screenshots, PR links, the
  `/stats` numbers moving). No generic hype, no panic posts.
- Tag `@base` and relevant builders when shipping integrations or frame updates.
- This is where foundations-track work (price feeds, corporate actions, Solana) becomes public
  proof — the ship log and the foundations plan feed each other.

---

## Sequencing & dependencies

| Phase | Blocks on | New infra |
|---|---|---|
| P1 gate | none — DAYC read exists | `dayc-gate.ts`, `/api/dayc/eligibility`, tier storage |
| P1 sink | pick sink (burn vs treasury) | `circles.pinnedUntil`, `/api/circles/pin`, DAYC-transfer guard |
| P2 frames | Farcaster account | `app/frames/*` (frame image + POST) |
| P3 genesis | P1 eligibility | Genesis circle (data), holder export |
| P3 fees | fees actually received | fee-recycling policy + public tx proof |
| P4 | none | none (process) |

Decisions needed from owner:
1. **Sink = burn (dead address) or treasury wallet?** (Burn is the stronger deflation story.)
2. **Gate threshold** — confirm 500,000 DAYC, and whether it gates premium only (recommended) or
   circle creation broadly.
3. **Pin price** in DAYC.
4. **Fee-recycling %** and cadence.

## Honesty guardrails (non-negotiable)
- All fund movements are **signed by the user** in their own wallet; Daybreak never executes trades
  or moves user funds itself.
- Eligibility stays private and binary; balances are never shown to other members.
- Fee recycling references only received fees with onchain proof; no promised yield or price target.
- The burn is labeled irreversible before signing.

## Gate discipline
Each phase ships with a `GATES.md` (per the `unlazy` discipline) carrying runnable `CHECK:` /
`EXPECT:` oracles and source-backed manual evidence for what automation can't determine. No step is
"done" until its gate verifies against a real onchain read.
