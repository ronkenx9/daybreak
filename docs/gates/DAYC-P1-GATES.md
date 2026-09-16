# GATES — $DAYC membership gate (growth plan Phase 1, Step 1)

Scope: server-verified DAYC holder tier + Member badge. No funds move; read-only on-chain.

## G1 — tier reflects real on-chain balance
- CHECK: `daycTier(balanceOf(address))` on Base for a large holder vs an empty address.
- EXPECT: holder ≥ 500,000 DAYC → `member`; empty → `none`.
- EVIDENCE (2026-09-16, base-rpc.publicnode.com, live read):
  - Uniswap v4 PoolManager `0x4985…2b2b` = 80,447,436,239 DAYC → `member` ✓
  - Dead address `0x…dEaD` = 0 DAYC → `none` ✓

## G2 — ownership is proven, not spoofable
- CHECK: `/api/dayc/eligibility` uses `requireUserOwningWallet(req, address)`.
- EXPECT: an address not linked to the signed-in Privy account is rejected (409), same as
  `/api/holdings/sync`. Tier cannot be claimed for a wallet you do not own.

## G3 — privacy: binary tier, no balance leak to others
- CHECK: the badge shown to the account is derived from its own eligibility call; the balance is
  returned only to the wallet's owner (the caller proves ownership).
- EXPECT: no endpoint exposes another user's DAYC balance or tier. (Cross-user tier surfacing is a
  later increment and will persist only the binary flag, like `holdingEligibilities`.)

## G4 — non-blocking funnel
- CHECK: non-members still explore, join, and use the app; only the badge/perk is gated.
- EXPECT: no core flow is blocked by membership in this step.

## Type/build
- CHECK: `npx tsc --noEmit` → clean for the added files. ✓ (2026-09-16)

## Not yet gated (follow-ups)
- Persisted cross-user Member badge (needs a profile flag + migration).
- Step 2 burn/sink pin (awaits burn-vs-treasury decision).
