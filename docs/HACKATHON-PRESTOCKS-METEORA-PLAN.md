# Hackathon build plan — PreStocks discovery + Meteora DBC native launchpad

Target bounties: **Best Use of PreStocks** ($5k) and **Best Use of Meteora DBC** ($5k).
Clawpump is intentionally out of scope (it requires launching through the Clawpump
launchpad; we are building our own DBC launch, so Clawpump would be redundant).

Everything below is verified against a live source before it is a step. No fabricated
endpoints, mints, or SDK calls. Discipline: each track ships with a GATES file that has a
runnable CHECK and an EXPECT, real numbers, and honest gating where funds/keys are required.

Date: 2026-09-17. Repo is already on mainnet and deploys to daybreakcircles.lol via
`git push origin main` (Vercel). "Make it live" = merge to main.

---

## Verified sources (checked 2026-09-17)

### PreStocks — `GET https://prestocks.com/api/prestocks`
Returns a JSON array of 8 pre-IPO tokens on **Solana**. Each object:
`{ name, symbol, description, image, external_url, contract_address (mint), markPrice,
markValuation, tokenPrice, impliedValuation, supply }`.

| symbol | company | mint | tokenPrice | implied val |
|---|---|---|---|---|
| ANDURIL | Anduril | `PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB` | 148.64 | 131.5B |
| ANTHROPIC | Anthropic | `Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw` | 991.90 | 1625.1B |
| FIGUREAI | Figure AI | `PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd` | 175.30 | 38.2B |
| KALSHI | Kalshi | `PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua` | 849.32 | 30.9B |
| NEURALINK | Neuralink | `PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S` | 341.85 | 65.1B |
| OPENAI | OpenAI | `PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF` | 1066.94 | 1321.9B |
| POLYMARKET | Polymarket | `Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP` | 144.60 | 14.3B |
| SPACEX | SpaceX | `PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh` | 123.86 | 1623.9B |

Compliance note from PreStocks itself: tokens "confer no ownership, voting, dividend,
information, or other legal rights"; each is "backed 1:1 by SPV exposure." This must be
surfaced in the UI (reuse the InstrumentFacts pattern).

### News for private companies
Finnhub company-news is keyed by **public** ticker and cannot return company news for
Anthropic/OpenAI/SpaceX/Anduril/etc. (our provider already skips SpaceX for this reason).
Pre-IPO news source: **GDELT Doc 2.0 API** (`https://api.gdeltproject.org/api/v2/doc/doc`),
free, no key, keyword query per company name. CHECK before building the fetcher.

### Meteora DBC — `@meteora-ag/dynamic-bonding-curve-sdk`
Program ID (mainnet): `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`.
Client: `new DynamicBondingCurveClient(connection, 'confirmed')`.
- Curve config: `buildCurve(...)` / `buildCurveWithMarketCap(...)` -> spread into config.
- Create config+pool: `client.partner.createConfig(...)`, `client.pool.createConfigAndPool(...)`,
  `createConfigAndPoolWithFirstBuy(...)`.
- State: `client.state.getPool(addr)`, `getPoolConfig(addr)`, `getPoolQuoteTokenCurveProgress(addr)`.
- Quote: `client.pool.swapQuote({ virtualPool, config, swapBaseForQuote, amountIn, slippageBps, currentPoint })`.
- Swap tx: `client.pool.swap({...})` / `swap2({ swapMode: SwapMode.ExactIn })`.
- Migration keepers auto-migrate to DAMM v2 when quote reserve >= migration threshold, for
  supported quote tokens (SOL, USDC, JUP, ...).

---

## Track A — PreStocks discovery + live pre-IPO news (fully shippable, no funds/keys)

Goal: a new discovery lane for tokenized pre-IPO companies, with live price + implied
valuation + a live news feed behind each name, and holdings support.

- **A1 registry.** `lib/solana/prestocks-registry.ts` (server-only): the 8 tokens above
  (symbol, company, mint, image, external_url, decimals — verify on-chain). Client-safe
  `lib/solana/prestocks-tickers.ts` mirror. GATE: mints match live API.
- **A2 prices.** `lib/providers/prestocks.ts` `fetchPreStocks()` hitting the live API with a
  short cache (reuse `lib/news/cache.ts` snapshot pattern for last-good). `/api/prestocks`
  route. GATE: route returns 8 rows with tokenPrice + impliedValuation from the live API.
- **A3 pre-IPO news.** `lib/news/prestocks-news.ts` using GDELT keyword-by-company, mapped to
  the existing `Article`/`FeedItem` shape (title,url,source,seenAt,image). `/api/prestocks/news`.
  Reuse url-canonicalization + SSRF guards in `lib/news/url.ts`/`preview.ts`. GATE: at least
  one live headline for Anthropic and OpenAI, with real source domains.
- **A4 discovery UI.** A "Pre-IPO" section on the discovery surface: card per company (logo,
  token price, implied valuation, premium = markPrice vs tokenPrice), tapping opens detail
  with the live news lane and the no-rights/SPV compliance note. Reuse StockIcon + card CSS;
  dark-mode-first, crypto-first shine on the number. GATE: renders 8 cards, dark render clean.
- **A5 holdings.** Extend the Solana holdings reader to include PreStocks mints so a holder
  sees them on the Holdings page. First verify the token program (SPL vs Token-2022) for one
  mint; branch the parsed-accounts read accordingly. GATE: a wallet holding a PreStocks token
  shows the row (or documented as needing a funded test wallet).
- **A6 ship.** Verify locally (preview), then `git push origin main`. GATE: live site shows the
  Pre-IPO lane.

## Track B — Meteora DBC native launchpad (our own launch + liquidity rail)

Goal: Daybreak's **native** launch/liquidity mechanism on Solana (no offramp to Uniswap),
tuned for equity-like assets — the DBC bounty's ask. A creator launches a community token
themed to a stock / pre-IPO name; buyers trade on the curve in-app; it graduates to DAMM v2.

Originality (the judged part): an **equity-tuned DBC config**, not a memecoin curve.
- Anchor start price to a real reference: Pyth oracle for listed names, PreStocks
  `tokenPrice`/`impliedValuation` for pre-IPO names — real price discovery for thin pairs.
- IPO-style **decaying fee schedule**: high fee at launch (anti-snipe on thin pairs) decaying
  toward a low steady-state fee.
- Graduation rule tuned for equities (convergence-to-reference / session-aware), documented.

Steps:
- **B1 SDK.** Add `@meteora-ag/dynamic-bonding-curve-sdk` + `bn.js`. GATE: import + program ID
  resolves against mainnet.
- **B2 config builder.** `lib/solana/dbc/config.ts` — `buildEquityCurve({ reference, ... })`
  wrapping `buildCurve`/`buildCurveWithMarketCap` with the equity-tuned params above. Pure
  function. GATE: deterministic config object for a fixed input (unit-checkable numbers).
- **B3 launch tx.** `lib/solana/dbc/launch.ts` builds the create-config+pool transaction
  (`createConfigAndPool`) returning an **unsigned** tx; `/api/solana/dbc/launch`. User signs
  via Privy `signSolanaTransaction`. GATE: builds a valid tx (simulate); a real mainnet pool
  needs the creator's funded wallet + signature (correct by design — the creator launches).
- **B4 native buy.** `lib/solana/dbc/trade.ts` — `swapQuote` + `swap` builders;
  `/api/solana/dbc/quote` and `/api/solana/dbc/swap`. In-app buy on the curve, user-signed.
  GATE: quote returns for a live/known pool; swap tx simulates.
- **B5 monitor.** Curve-progress + graduation dashboard via `getPoolQuoteTokenCurveProgress` +
  `getPool`. Issuer view (bounty asks for issuer tooling). GATE: reads progress for a pool.
- **B6 launch UI + ship.** In-app launch flow + pool page; verify; push to main. GATE: flow
  reachable, one signature from a live pool.

Honest gate for B: I build the whole flow and it simulates, but the first real mainnet pool
and the first real on-curve buy require a funded Solana wallet and the user's signature — I do
not move funds or sign. That is the intended launchpad design, not a workaround.

---

## Sequence
A1 -> A2 -> A3 -> A4 -> A5 -> A6 (ship Track A), then B1 -> B2 -> B3 -> B4 -> B5 -> B6.
Track A is shippable immediately and is the PreStocks bounty on its own. Track B is the DBC
bounty and the "native, not offramp" rail. Each step lands with its GATE evidence.
