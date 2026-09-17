# GATES — Meteora DBC native launchpad (Track B)

Verified 2026-09-17 against the real SDK (`@meteora-ag/dynamic-bonding-curve-sdk`) and
Solana mainnet. The equity-tuned config is the judged originality; the launch is the
"native, not offramp" rail.

## G1 — SDK + program resolve on mainnet
CHECK: import the SDK; read program id and enums.
EXPECT: `DYNAMIC_BONDING_CURVE_PROGRAM_ID = dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`,
`MigrationOption.MET_DAMM_V2`, `BaseFeeMode.FeeSchedulerExponential`, `TokenType.Token2022`.
RESULT: PASS — all resolved from the installed package.

## G2 — Equity-tuned config is real, deterministic, and anchored
CHECK: `buildEquityCurve` via `buildCurveWithMarketCap` with fixed inputs.
EXPECT: builds a valid ConfigParameters; deterministic across calls; migration threshold
scales linearly with the reference valuation; IPO-style fee decay 500->100 bps; DAMM v2.
RESULT: PASS — sqrtStartPrice identical across two builds (3195071580409354);
migrationQuoteThreshold scaled exactly 10.00x when the reference went 60k->600k
(72.25 USDC -> 722.5 USDC); exponential fee scheduler 500->100 bps encoded; migration =
MET_DAMM_V2. Note: DBC requires >=10% migration liquidity locked — config locks 10% on the
creator side (found via the SDK's own validation, then satisfied).

## G3 — Launch transaction is a real, signable DBC pool creation
CHECK: POST /api/solana/dbc/launch with a creator pubkey; decode the returned tx.
EXPECT: a base64 transaction whose instructions target the DBC program, feePayer = creator,
partial-signed by the ephemeral config + mint accounts, awaiting only the creator's signature.
RESULT: PASS — pool 4XDCQLUHbaDe3Upaxx3qFH8A8AV4AWBcn43EFNWWzw25, quote = USDC, band
30k->300k; decoded tx = 2 instructions, BOTH to dbcij3…SMaqN, feePayer = creator,
2 of 3 signatures present (config + mint signed; creator/feePayer left for Privy).

## G4 — Native buy + monitor read paths compile against the real API
CHECK: `quoteDbcBuy` (swapQuote quote->base) and `readDbcPoolStatus`
(getPoolQuoteTokenCurveProgress + getPriceFromSqrtPrice) typecheck and build.
EXPECT: `npm run build` compiles /api/solana/dbc/quote and /pool.
RESULT: PASS at build. Runtime numbers require a live DBC pool (none launched yet); both
read a pool by address and are exercised the moment a pool exists.

## G5 — Native flow wired end to end in-app (build -> sign -> submit -> monitor)
CHECK: Launch page renders DbcLaunchPanel; sign via `account.signSolanaTransaction`;
submit via /api/solana/dbc/submit; success view polls /api/solana/dbc/pool for curve progress.
EXPECT: panel renders with equity mechanics (5%->1% fee, anchored band, DAMM v2) and a form;
build gated behind sign-in; honest note that signing needs the creator's funded Solana wallet.
RESULT: PASS for render + gating (verified in browser). The one on-chain step I cannot do is
the creator's signature on a FUNDED Solana wallet (rent), which is the intended launchpad
design — the person launching pays and signs. Everything up to that signature is built and
verified; the tx is one signature from a live mainnet pool.

## G6 — Build clean
CHECK: `npm run build`.
EXPECT: success; all DBC + PreStocks routes present.
RESULT: PASS — /api/solana/dbc/{launch,pool,quote,submit} and /api/prestocks{,/news,/holdings}
all compiled. Warnings are the pre-existing benign bigint JS-fallback notices.

## Honest gate summary
Blocked only on a funded Solana wallet + the creator's signature to create the first real
mainnet pool and first on-curve buy. No funds are moved by the code; the creator authorizes
and pays. Provide a funded wallet and the launch is live.
