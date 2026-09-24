# xStocks on X Layer

Daybreak reads xStocks (Backed / Kraken) tokenized equities on X Layer mainnet (chain 196) alongside its existing Base and Solana stock tokens.

## What was added (2026-09-24)

- `lib/xlayer/tokens.ts`: verified registry of 20 xStocks on X Layer (token, ERC-4626 wrapper, ISIN, Daybreak company link) plus the issuer's USDC and USDG settlement tokens.
- `lib/xlayer/stocks.ts`: one Multicall3 read per snapshot for live supply, the rebasing multiplier and wrapper backing, and for wallet holdings with wrapped balances converted to underlying shares.
- `GET /api/xlayer/stocks[?symbol=TSLA]`: registry plus live on-chain supply.
- `GET /api/xlayer/holdings?address=0x…`: a wallet's xStocks on X Layer, direct and wrapped.
- OKX AI public tools `list_xlayer_stock_tokens` and `get_xlayer_stock_holdings`. `discover_stock_tokens` now also returns `eip155:196` instruments.
- `scripts/verify-xlayer-stocks.mjs`: re-checks every registry row against the xStocks issuer API and X Layer mainnet.

## Token model

- **xStock token** (e.g. `TSLAx`): rebasing ERC-20, 18 decimals. `balanceOf` = shares × `multiplier()` / 1e18. Multipliers differ per stock; NFLXx reads 10 after its split. Daybreak reports both token units and underlying shares.
- **Wrapper** (e.g. `wTSLAx`): non-rebasing ERC-4626 over the token, used by DEX pools. `asset()` returns the token. Wrapped balances are converted with `convertToAssets` before being counted as shares.
- Supply is not price. Daybreak labels equity prices as underlying references, not executable token quotes.

## Contract addresses (X Layer mainnet, chain 196)

Source: `https://api.xstocks.fi/api/v2/public/assets` (network `XLayer`). Verified on-chain at block 71484700 and again at 71484911.

| Ticker | xStock | Token | ERC-4626 wrapper |
| --- | --- | --- | --- |
| TSLA | TSLAx | [`0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0`](https://www.oklink.com/xlayer/token/0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0) | [`0xc3fdbe3a68ee5de461d30415a8165cf9aefe1171`](https://www.oklink.com/xlayer/token/0xc3fdbe3a68ee5de461d30415a8165cf9aefe1171) |
| NVDA | NVDAx | [`0xc845b2894dbddd03858fd2d643b4ef725fe0849d`](https://www.oklink.com/xlayer/token/0xc845b2894dbddd03858fd2d643b4ef725fe0849d) | [`0xa8ddb5cd96b5222afe198316e9a57caa642850d5`](https://www.oklink.com/xlayer/token/0xa8ddb5cd96b5222afe198316e9a57caa642850d5) |
| AAPL | AAPLx | [`0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a`](https://www.oklink.com/xlayer/token/0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a) | [`0x943bf64d566c32a2bcd41ac92fb63c111cc9de8f`](https://www.oklink.com/xlayer/token/0x943bf64d566c32a2bcd41ac92fb63c111cc9de8f) |
| MSFT | MSFTx | [`0x5621737f42dae558b81269fcb9e9e70c19aa6b35`](https://www.oklink.com/xlayer/token/0x5621737f42dae558b81269fcb9e9e70c19aa6b35) | [`0x166fbe68274b6a47e025f4ba17388c539f1fa1d0`](https://www.oklink.com/xlayer/token/0x166fbe68274b6a47e025f4ba17388c539f1fa1d0) |
| AMZN | AMZNx | [`0x3557ba345b01efa20a1bddc61f573bfd87195081`](https://www.oklink.com/xlayer/token/0x3557ba345b01efa20a1bddc61f573bfd87195081) | [`0x910cabde3eba7fc1ce64fd14bd680b9f60fa0f90`](https://www.oklink.com/xlayer/token/0x910cabde3eba7fc1ce64fd14bd680b9f60fa0f90) |
| GOOGL | GOOGLx | [`0xe92f673ca36c5e2efd2de7628f815f84807e803f`](https://www.oklink.com/xlayer/token/0xe92f673ca36c5e2efd2de7628f815f84807e803f) | [`0xf8c5308f80e459bb53d9ebe689854d9cbb2caa6f`](https://www.oklink.com/xlayer/token/0xf8c5308f80e459bb53d9ebe689854d9cbb2caa6f) |
| META | METAx | [`0x96702be57cd9777f835117a809c7124fe4ec989a`](https://www.oklink.com/xlayer/token/0x96702be57cd9777f835117a809c7124fe4ec989a) | [`0xe840946ffebcd66b7c4e95095effafadfa0d0e56`](https://www.oklink.com/xlayer/token/0xe840946ffebcd66b7c4e95095effafadfa0d0e56) |
| MSTR | MSTRx | [`0xae2f842ef90c0d5213259ab82639d5bbf649b08e`](https://www.oklink.com/xlayer/token/0xae2f842ef90c0d5213259ab82639d5bbf649b08e) | [`0x30987adf0b11dc698438a99ba04ec3a1ab2c7eab`](https://www.oklink.com/xlayer/token/0x30987adf0b11dc698438a99ba04ec3a1ab2c7eab) |
| COIN | COINx | [`0x364f210f430ec2448fc68a49203040f6124096f0`](https://www.oklink.com/xlayer/token/0x364f210f430ec2448fc68a49203040f6124096f0) | [`0x44c7ed7ffdf8465c9d27f60aec845eed3d49d56e`](https://www.oklink.com/xlayer/token/0x44c7ed7ffdf8465c9d27f60aec845eed3d49d56e) |
| CRCL | CRCLx | [`0xfebded1b0986a8ee107f5ab1a1c5a813491deceb`](https://www.oklink.com/xlayer/token/0xfebded1b0986a8ee107f5ab1a1c5a813491deceb) | [`0xb11134f14d5b94db60d4599dfdc3bf1bba2150e8`](https://www.oklink.com/xlayer/token/0xb11134f14d5b94db60d4599dfdc3bf1bba2150e8) |
| SPY | SPYx | [`0x90a2a4c76b5d8c0bc892a69ea28aa775a8f2dd48`](https://www.oklink.com/xlayer/token/0x90a2a4c76b5d8c0bc892a69ea28aa775a8f2dd48) | [`0xe7e553cd128f0011777323a0b44a7b96ea1cb540`](https://www.oklink.com/xlayer/token/0xe7e553cd128f0011777323a0b44a7b96ea1cb540) |
| QQQ | QQQx | [`0xa753a7395cae905cd615da0b82a53e0560f250af`](https://www.oklink.com/xlayer/token/0xa753a7395cae905cd615da0b82a53e0560f250af) | [`0x4c1ae29c159838fc1b224636e28e086eb69101f7`](https://www.oklink.com/xlayer/token/0x4c1ae29c159838fc1b224636e28e086eb69101f7) |
| HOOD | HOODx | [`0xe1385fdd5ffb10081cd52c56584f25efa9084015`](https://www.oklink.com/xlayer/token/0xe1385fdd5ffb10081cd52c56584f25efa9084015) | [`0x59801175a9b2248f9bf4ba7f82e17045c4672ec8`](https://www.oklink.com/xlayer/token/0x59801175a9b2248f9bf4ba7f82e17045c4672ec8) |
| PLTR | PLTRx | [`0x6d482cec5f9dd1f05ccee9fd3ff79b246170f8e2`](https://www.oklink.com/xlayer/token/0x6d482cec5f9dd1f05ccee9fd3ff79b246170f8e2) | [`0x4a2df09536f62341c9f946427d16414c04e21342`](https://www.oklink.com/xlayer/token/0x4a2df09536f62341c9f946427d16414c04e21342) |
| GME | GMEx | [`0xe5f6d3b2405abdfe6f660e63202b25d23763160d`](https://www.oklink.com/xlayer/token/0xe5f6d3b2405abdfe6f660e63202b25d23763160d) | [`0x459d3ae62b86cc6125e06260dddfd3afed24a877`](https://www.oklink.com/xlayer/token/0x459d3ae62b86cc6125e06260dddfd3afed24a877) |
| AMD | AMDx | [`0x3522513e5f146a2006e2901b05f16b2821485e19`](https://www.oklink.com/xlayer/token/0x3522513e5f146a2006e2901b05f16b2821485e19) | [`0xee7ccb0d37a12862e7f92f6c92a93d9c2d304266`](https://www.oklink.com/xlayer/token/0xee7ccb0d37a12862e7f92f6c92a93d9c2d304266) |
| NFLX | NFLXx | [`0xa6a65ac27e76cd53cb790473e4345c46e5ebf961`](https://www.oklink.com/xlayer/token/0xa6a65ac27e76cd53cb790473e4345c46e5ebf961) | [`0x7d87fd6a379714194a797c0bbb8b40c30d250856`](https://www.oklink.com/xlayer/token/0x7d87fd6a379714194a797c0bbb8b40c30d250856) |
| GLD | GLDx | [`0x2380f2673c640fb67e2d6b55b44c62f0e0e69da9`](https://www.oklink.com/xlayer/token/0x2380f2673c640fb67e2d6b55b44c62f0e0e69da9) | [`0x735f1509bff25e27cd442b9bfb231324648ead9b`](https://www.oklink.com/xlayer/token/0x735f1509bff25e27cd442b9bfb231324648ead9b) |
| INTC | INTCx | [`0xf8a80d1cb9cfd70d03d655d9df42339846f3b3c8`](https://www.oklink.com/xlayer/token/0xf8a80d1cb9cfd70d03d655d9df42339846f3b3c8) | [`0x33aa35b0271fffe2048cc093ab7fe60931786719`](https://www.oklink.com/xlayer/token/0x33aa35b0271fffe2048cc093ab7fe60931786719) |
| ORCL | ORCLx | [`0x548308e91ec9f285c7bff05295badbd56a6e4971`](https://www.oklink.com/xlayer/token/0x548308e91ec9f285c7bff05295badbd56a6e4971) | [`0x1349456830ddc3d8599e4d6a63698883eca67ada`](https://www.oklink.com/xlayer/token/0x1349456830ddc3d8599e4d6a63698883eca67ada) |

Settlement stablecoins: USDC `0xb6ceceab302e2e4948951ee7843fc24e92933061`, USDG `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` (6 decimals).

## Verify

```sh
node scripts/verify-xlayer-stocks.mjs   # add NODE_USE_ENV_PROXY=1 behind an HTTPS proxy
curl -sS 'https://www.daybreakcircles.lol/api/xlayer/stocks?symbol=TSLA'
curl -sS -X POST 'https://www.daybreakcircles.lol/api/okx/tools' -H 'content-type: application/json' \
  --data '{"tool":"list_xlayer_stock_tokens","arguments":{"query":"NVDA"}}'
```

The production URLs work once this branch is deployed. Override the RPC with `XLAYER_RPC_URL` if the public node rate-limits.

## Conviction vault (contracts/)

`DaybreakConvictionVault` lets anyone open a public thesis on a supported xStock, and lets backers lock real xStocks behind it until it expires. Backers then withdraw exactly what they locked. There is no payout, no settlement and no admin.

- **One signature plus one transaction.** xStocks on X Layer implement EIP-2612 (domain: the token name, version `1`, chain 196; verified on-chain). `backWithPermit` therefore replaces the separate approval, and it still succeeds if the permit was front-run.
- **Rebasing-safe.** Deposits of the rebasing xStock are wrapped into the issuer's ERC-4626 wrapper, so corporate-action rebases accrue to the backer.
- **Tests.** They run on an X Layer mainnet fork against the real NVDAx and wNVDAx: `cd contracts && npm ci && NODE_USE_ENV_PROXY=1 npm test` (the proxy flag is only needed behind an HTTPS proxy).
- **Deploy.** Run `XLAYER_DEPLOYER_KEY=… npm run deploy:xlayer`. It uses about 2.6M gas, roughly 0.00005 OKB at 0.02 gwei, but keep about 0.005 OKB in the wallet for the fee cap. The script writes `contracts/deployments/xlayer.json`. Set `NEXT_PUBLIC_XLAYER_VAULT_ADDRESS` to the deployed address.
- **Issuer risk.** The wrappers are upgradeable proxies owned by the issuer. The vault cannot move funds, but the issuer can change the wrapper.

## In the app

X Layer is another network on each stock, not a separate section:

- **Stock page, "Compare instruments":** an X Layer card sits next to Base and Solana. Selecting it shows your X Layer balance, the OKB needed for fees, and that stock's theses. From there you can open a thesis, back one with a permit, or withdraw after expiry, with pending and confirmed states and explorer links.
- **You, "xStocks":** Solana and X Layer holdings of the same product merge into one position per company, with the per-chain split shown as detail.
- **APIs:** `/api/xlayer/theses[?backer=]`, `/api/xlayer/permit?symbol=&owner=`, `/api/xlayer/tx?hash=`.
- **Wallet guard:** `sendXLayerTransaction` only sends to the vault (open, back, back with permit, withdraw) or approves the vault on a verified xStock. `signXLayerPermit` only signs permits whose spender is the vault.

## Not yet built

- In-app swaps into xStocks on X Layer. OKX DEX aggregator quotes need OKX API keys.
- Gas sponsorship: users need a little OKB on X Layer.
- X Layer holdings do not yet count toward Circle eligibility, which is Base and Solana only.
