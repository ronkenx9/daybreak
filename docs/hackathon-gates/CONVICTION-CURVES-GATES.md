# GATES — Conviction Curves (PreStocks × Meteora DBC)

Verified 2026-09-18. A belief market for a pre-IPO name, built on Meteora DBC, holder-gated
on the PreStocks token and anchored to its live implied valuation.

## G0 — Feasibility check that forced the design (verify-before-build)
CHECK: derive the DBC token-badge PDA for PreStocks mints and read them on mainnet.
EXPECT: decide whether a PreStocks token can be a DBC *quote mint*.
RESULT: PASS/DECIDED — no token badge exists for ANTHROPIC or OPENAI mints (both `exists:false`).
PreStocks mints are also Token-2022 with a transfer fee + transfer hook + pausable config, which
breaks AMM quote accounting. Conclusion: PreStocks CANNOT be a DBC quote mint. Design pivoted to
a USDC-quoted curve that is (a) anchored to the pre-IPO implied valuation and (b) holder-gated.
This is the honest, mainnet-viable path — not slides.

## G1 — Valuation-anchored reference band
CHECK: map each live PreStocks implied valuation to a DBC band.
EXPECT: bigger company -> bigger belief pool, clamped to a sane range ($10k..$500k reference).
RESULT: PASS — POLYMARKET $14.2B -> ref $14,234 (band $7,117->$71,170); ANDURIL $137B -> ref
$137,440 (band $68,720->$687,200); OPENAI/ANTHROPIC/SPACEX (>$500B) clamp to ref $500,000
(band $250,000->$2,500,000). Deterministic (convictionReference in lib/solana/dbc/conviction.ts).

## G2 — Holder gate enforced on-chain (server-side)
CHECK: POST /api/solana/dbc/conviction with a non-holder wallet.
EXPECT: 403 with a holder-gate message; no transaction built.
RESULT: PASS — non-holder (So111…112) -> HTTP 403 `{"error":"Hold OPENAI on Solana to launch its
belief market","gate":"holder"}`. The gate reads real PreStocks (Token-2022) balances via
readPreStockHoldings before building anything.

## G3 — Real, signable DBC launch transaction
CHECK: build the conviction launch (via the proven buildLaunchTransaction) and decode it.
EXPECT: a base64 tx whose instructions target the DBC program, feePayer = creator, awaiting only
the creator's signature; band matches the anchored reference.
RESULT: PASS — OpenAI belief token "OpenAI Believers"/OPENABLV: pool
Fc2QXKe8CyD1MXXEkkz5zLWrsKw7L5BWFtQJcGXUAgm4, band $250k->$2.5M, instructions to
dbcij3…SMaqN, 2 of 3 signatures (creator/fee-payer left for Privy).

## G4 — In-app belief-market panel with correct gate states
CHECK: open a pre-IPO company detail; inspect the ConvictionMarket panel.
EXPECT: "Belief market · DBC" panel with a valuation-anchored explanation and a gate state
(sign-in / hold-token / holder-can-launch / launched+progress).
RESULT: PASS — Anduril detail shows "Back your conviction in Anduril.", the anchored/DAMM-v2
explanation, "Holders of ANDURIL only", and the "Sign in to back ANDURIL" gate. Authenticated
holders get a launch button; launched pools show curve-progress-to-graduation.

## G5 — Build clean
CHECK: `next build`.
RESULT: PASS — /api/solana/dbc/conviction compiled; whole app builds.

## Honest gate
The first real belief-market pool needs a wallet that (a) holds the PreStocks token and (b) has
SOL for rent, plus the creator's signature. No funds move server-side. Everything up to that
signature is built and verified; the tx is one signature from a live mainnet pool.

## Life after the hackathon
Every pre-IPO name can have a holder-gated belief market with a Circle around it. It routes real
demand to PreStocks (you must hold the asset to participate), gives thin pre-IPO names a
valuation-anchored price-discovery curve, and graduates into durable DAMM v2 liquidity.
