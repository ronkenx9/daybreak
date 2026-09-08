# Bankr capability matrix — Phase 0 (package A)

Status: **application execution not live-proven.** September 8 inspection confirms `BANKR_API_KEY` is set in `.env.local`; the previous claim that no credentials were configured was stale. Existing brain notes record an earlier successful read-only wallet check. A fresh read-only `GET /wallet/me` check on September 8 returned HTTP 200 using the configured key; no secrets or wallet details were printed and no transaction was submitted. The unfinished work is per-user wallet authority and connecting the adapter to app quote/execute/launch routes and UI. See [concrete implementation plan](../DAYBREAK-APP-IMPLEMENTATION-PLAN.md). Findings below were read from Bankr docs on September 6 and require current endpoint-specific verification before execution.

## Verified from documentation

### Auth modes
- **User key:** `X-API-Key: bk_usr_{keyId}_{secret}` (or `Authorization: Bearer <same>`). Acts on the wallet that owns the key. `feeRecipient` optional (defaults to that wallet).
- **Partner/org key:** `X-Partner-Key: bk_ptr_{keyId}_{secret}`. Deploys from a partner wallet on behalf of an end user. `feeRecipient` **required**. Base-only. `degenMode` rejected.
- **Privy JWT:** cookie-based auth for web frontends. Write endpoints require the "Wallet API" flag on the key **plus IP allowlist**.
- Read endpoints: any valid key with an associated wallet. Write endpoints: "Wallet API" flag + IP allowlist.

### Swap — `POST /wallet/swap-quote` → `POST /wallet/swap`
- Quote req: `fromChain`, `fromToken`, `toChain`, `toToken`, `amount` (human-readable), `slippageBps` (10–2000, default 500).
- Quote resp: `from{chain,token,amount,formattedAmount,symbol,decimals,usdValue}`, `to{...}`, `minBuyAmount`, `feeBps`, `feeWaivedForEcosystemToken`, `slippageBps`, `priceImpactBps`, `swapImpactBps`, `networkCostsUsd`, `sellTokenPriceUsd`, `buyTokenPriceUsd`, `quoteId`.
- Execute req: quote fields + `minBuyAmount` (required), `quoteId` (optional), `idempotencyKey` (optional UUID).
- Execute resp: `success` (bool — **false means mined+reverted**), `hash`, `amountSold`, `amountReceived`, `amountSoldRaw`, `amountReceivedRaw`.
- **A reverted swap returns HTTP 200 with `success:false` — never treat 200 as confirmation.** Quote reuse is same-chain EVM only.
- **Tokenized-stock swaps require a location check at execution** (`403` without clearance). Quotes are NOT gated — a successful quote is not execution clearance.

### Deploy — `POST /token-launches/deploy`
- Req: `chain` (**default `"robinhood"` / chain 4663 — we must send `"base"`**; also `arbitrum`), `name`, `symbol`, `supply`, `feeRecipient{type:"wallet"|"x"|"farcaster"|"ens"}`, `pairedTokenAddress` (Base user-key only, allowlisted), `pairedStockAddress` (**mutually exclusive with `pairedTokenAddress`**), `quoteOnlyFees`, `degenMode`, `simulateOnly`.
- Resp: `txHash` (omitted when `simulateOnly:true`), deployed token address, "Uniswap v4 pool ID", `feeDistribution`, chain id, status.
- Quota: **3 counted launch attempts per rolling 24h per signing wallet.** Non-partner early cap: 2% of supply for first 5 min. On Base all three attempts are gas-sponsored.

### Supply / allocation
- Standard: **100B fixed**, 85% into Uniswap v4 pool, 15% preminted to fee recipient vested over 1yr with **30-day cliff** (or opt "no vesting" → 100% pool).
- Partner/org: **100% pool, no creator vesting.**

### Fees (verified — do NOT present 0.7% as total)
- **All-in swap fee 1.75% of volume**, split: Creator 0.665% · LP 0.285% · Bankr 0.475% · BNKR buyback 0.2375% · Doppler ~0.0875%.
- Creator = 95% of the 0.7% pool swap fee = 0.665%; with LP compounding ~0.95% all-in.
- Base quote-token options: WETH, BNKR, ba3Pump, cbHYPE, cbZEC, TAO — or `pairedStockAddress`.

### Errors (both surfaces)
`400` invalid/unsupported/insufficient/price-impact · `401` auth · `403` banned token / failed location check / wallet protection limit · `409` duplicate idempotencyKey still processing · `502/503/504` availability.

## Open items — require live credentials (do NOT assume; keep disabled until proven)
1. **Wallet mode.** Docs don't fully specify how wallets are provisioned/associated. Two candidates:
   - *User/partner API key acting on its wallet* — but a single shared Daybreak key must never be a pooled customer trading wallet.
   - *Privy-JWT web mode* — unproven whether Bankr accepts **Daybreak's** Privy app JWT (Bankr likely runs its own Privy app). Must test.
   Decision blocked until we prove per-user signing authority. Until then: external Uniswap handoff stays the fallback.
2. **Supported B20 stock allowlist** for `pairedStockAddress` (and for stock swaps) per auth mode.
3. **Partner fee-split configuration** and whether org launches can set both creator and Daybreak recipients.
4. **IP allowlist** operational requirement for write endpoints (server egress IP).
5. **Webhook signing/replay contract** (not documented here) — `POST /api/integrations/bankr/webhook` stays off until verified.
6. Live `simulateOnly` launch fixture + one stock swap quote fixture (Phase 0 steps 4–5).

## Consequence for the build (package B, this session)
Build the typed adapter, capability flags and durable operation schema **fail-closed**: no BANKR key → `configured:false`, every call refused, UI capability flags off, external handoff retained. Always set `chain:"base"` and verify receipt chain id 8453. Treat quote and execution as distinct; never mark success without `success:true` + reconciliation. Store money as raw integer strings + explicit decimals.
