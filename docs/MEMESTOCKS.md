# Memestocks — data source (built) and channel plan

Date 2026-09-06. Answers "where do we get memecoin/stock-pairing data from?" Owner chose memestocks over cultural memes; per the Base "Memes and Agents" thesis, a memestock is a meme token with a real on-chain linkage to the equity token (a liquidity pair with the tokenized stock).

## The correct signal (built)
Do NOT match by name — that returns dead impersonators (e.g. a scam "B20 Tesla Coin"). Instead read the **liquidity pools of the real B20 tokenized-stock token** and take the non-standard paired side. The linkage is a real on-chain pool with a known address, so it can't be spoofed.

- Source: DexScreener `GET /latest/dex/tokens/{stockAddress}` (free, no key). Alternatives per owner: GeckoTerminal `GET /networks/base/tokens/{address}/pools`; Aerodrome Slipstream / Uniswap v3 Base subgraphs for direct on-chain querying.
- Built: `lib/base/memecoins.ts` (`fetchMemeTokens(ticker)`), `app/api/memecoins/route.ts` (`GET /api/memecoins?ticker=NVDA`, cached 3 min).
- Guardrails: excludes standard quote liquidity (USDC/WETH/etc — that's the stock's own market), excludes the real stock token and any "b20" impersonator, min liquidity $5k + min 24h volume $100, flags `lowLiquidity` under $25k, caps 12, sorted by volume. Disclaimer returned with every response.

## Verified live output (2026-09-06)
- AAPL → LFG ($218k vol), DOGCOW, Newton, iPod, Apple Juice, PPAP, Apple Jack.
- MSFT → BLUESCREEN ($330k vol), Blue Screen of Death, CLIPPY, XBOX, BillCoin.
- NVDA → BLUECHIP ($818k vol), Na'vidia, PrinterInkCoin, GPU, DiamondPepe.
- TSLA → Sparky (the Tesla dog), Cyberduck, LiTesla. COIN/SBUX → empty (honest).
Real, culturally on-theme, actively traded, and only for companies that have a tokenized stock (no equity token → no memestock channel).

## Channel UI (built 2026-09-06)
`components/daybreak/Memestocks.tsx`: a "Memestocks" tab in the stock detail sheet and (for tokenized companies) the company dialog. Lists paired tokens with 24h volume and a low-liquidity flag; the disclaimer sits at the top. Tapping a token opens an **in-app** detail (price / liquidity / 24h volume, an amber "not the company or its stock — speculative, often go to zero" warning, and a single explicit "View on DexScreener" outbound action) — the detail never leaves Daybreak, preserving immersion. Never mixed into the real tokenized-stock discovery. Verified in-browser: AAPL shows Lil Finder Guy/Dogcow/Apple Juice/Newton/iPod, detail renders, no console errors.

## Not done / hardening
Real scam/honeypot screening (GoPlus / Honeypot.is) beyond liquidity+volume floors; GeckoTerminal fallback when DexScreener rate-limits; detecting fee-routing-into-underlying mechanics (the deeper thesis linkage). This supersedes the earlier FUTURE-PLANS "cultural memes, not memecoin pairs" note.


## Discover restructure (2026-09-06, afternoon)
Owner: memestocks were too hidden behind a stock's detail tab. Reworked Discover into two top-level tabs, **Stocks** and **Memestocks** (replacing the old category chips + dual lists).
- **Stocks** tab: only Base tokenized stocks (13) — dropped Sony/Netflix/Starbucks (not on Base). Cards carry real brand logos, live price, bookmark (keyed by ticker) and open the stock sheet.
- **Memestocks** tab: `TrendingMemestocks` — one ranked feed across all stocks via `GET /api/memecoins/trending` (`fetchTrending` queries each stock token individually and merges; the multi-address DexScreener call caps at ~30 pairs and gets crowded out by USDC pools, so per-token + merge is required). Each row is tagged with its parent stock; tapping opens the shared in-app `MemestockDetail`.
- Logos: fetched brand-colored SVGs from Simple Icons for GOOGL/NVDA/TSLA/META/COIN/INTC/SPCX/CRCL/MSTR (+ existing AAPL/AMZN); Microsoft hand-built (4-square, Simple Icons removed it); AMZN kept existing; SanDisk stays monogram. `LOGO_TICKERS` in Identity.tsx updated.
- Bookmarks now key by ticker; Holdings "saved companies" reads from TOKENS.
Verified in-browser: Stocks grid with logos, Memestocks feed (BOX·AMZN $2M, BLUECHIP·NVDA, Moonbase·SPCX, BLUESCREEN·MSFT…), in-app detail from the feed, no console errors. tsc + build pass.
