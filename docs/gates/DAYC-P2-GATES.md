# GATES — Farcaster $DAYC frame (growth plan Phase 2, Step 3)

Scope: a public, shareable Farcaster Frame (vNext) with a live $DAYC card. Read-only; no funds.

## G1 — valid frame meta
- CHECK: `GET /frames/dayc` returns `fc:frame` meta tags.
- EXPECT: `fc:frame=vNext`, `fc:frame:image`, aspect `1.91:1`, button 1 "Open Daybreak" (link → /app),
  button 2 "Buy $DAYC" (link → Uniswap). ✓ verified 2026-09-16 (all 9 tags present).

## G2 — live image renders
- CHECK: `GET /frames/dayc/image` returns a PNG.
- EXPECT: HTTP 200, `image/png`, 1200x630, live DAYC price + 24h change/volume from DexScreener.
  ✓ verified 2026-09-16 (200, PNG 1200x630, price $0.00000032, +1.9% 24h, vol $2,250).

## G3 — honesty / privacy
- CHECK: the card shows only public market data (price, change, volume) — no user data.
- EXPECT: numbers come from DexScreener live; nothing fabricated. ✓

## Type/build
- CHECK: `npx tsc --noEmit` → clean for the added routes. ✓

## Not yet gated (follow-ups)
- "Check my $DAYC balance" frame with a Farcaster-verified address (needs Neynar/hub validation).
- "Trending circles" frame image.
- Distribution: create the Farcaster account and cast in /base, /build (owner action).
