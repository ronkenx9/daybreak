# GATES — Circle pin sink (growth plan Phase 1, Step 2)

Scope: spend $DAYC to pin a circle to the top of the homepage; tokens go to the treasury.
User signs their own DAYC transfer; the server verifies it on-chain before pinning.

Config: treasury `0xbF676Ef8A8886cd217265fD534987344ea0cc84B`, price `DAYC_PIN_PRICE = 100,000`,
window `DAYC_PIN_HOURS = 48` (all in `lib/base/daybreak-token.ts`).

## G1 — migration applied (blocks everything)
- CHECK: `circles.pinned_until` column and `circle_pins` table exist on the DB.
- EXPECT: both present + `circle_pins_tx_hash_unique`. ✓ verified 2026-09-16 (live DB query).
- CHECK: circle listing still works. ✓ `GET /app/groups` → 200 after migration.

## G2 — payment verified on-chain (no trust in the client)
- CHECK: `verifyDaycPinPayment` requires: tx receipt `success`, ≥2 confirmations, a DAYC
  `Transfer` log to the treasury, `from` ∈ the user's owned wallets, `value` ≥ price.
- EXPECT: a tx that isn't a DAYC transfer to the treasury of ≥100k from your wallet is rejected
  with a specific reason. (Logic mirrors the proven Muse settle pattern.)
- CHECK: routes validate input — `POST /api/circles/pin {}` → 400. ✓

## G3 — anti-replay
- CHECK: `circle_pins.tx_hash` is UNIQUE; `pinCircle` inserts the pin row before setting the pin.
- EXPECT: reusing a tx_hash to pin again fails (409). ✓ constraint verified on DB.

## G4 — funds safety
- CHECK: the wallet method sends only `transfer(treasury, amount)` on the DAYC contract; the
  recipient is the fixed treasury constant, never client-supplied.
- CHECK: `isPinSinkConfigured` gates both the wallet method and the verifier — no treasury, no pin.
- EXPECT: funds can only ever move to the configured treasury. ✓ (code review)

## G5 — ordering
- CHECK: `listCircles` sorts pinned circles (pinned_until > now) first, then joined/eligible/count.
- EXPECT: a pinned circle appears at the top of the list until its window expires. ✓ (code)

## Type/build
- CHECK: `npx tsc --noEmit` → exit 0, 0 errors. ✓

## Remaining manual gate (needs a live payment)
- [ ] One real small pin: connect the Daybreak wallet holding ≥100k DAYC, click Pin, sign the
  transfer, confirm the circle pins and the DAYC lands in the treasury. This is the only step that
  cannot be automated without moving real funds; do it once before promoting the feature.
