# Base stock expansion — 2026-09-30

Daybreak now recognizes 38 Coinbase-issued B20 stocks with non-zero Base supply: the original 10 and 28 newly supplied contracts. The product identifies every asset by its exact contract address. Registered contracts with zero supply are excluded from the live catalog.

## Product behavior

- Discovery, stock details, holdings, circles, saved companies, news routing, agent discovery, and exact-instrument trade review all consume the same expanded allowlist.
- The original 10 continue to use the Chainlink proxy addresses documented by Base.
- Newer stocks use `nav_price` from Coinbase's official read-only Tokenized Stocks API until Base publishes their Chainlink proxies. The UI labels this value **Coinbase NAV**, preserves its source timestamp, and never presents it as an executable quote.
- A stock with non-zero issued supply but no observed secondary-market pool remains discoverable for holdings and community use. Daybreak labels it **Minted · pool pending** rather than implying that a route exists.
- COINc, CRCLc, and INTCc were removed from the live catalog because their registered B20 contracts still had zero supply at this review.

## New cohort

| Ticker | B20 contract | Market observed |
|---|---|---:|
| MUc | `0xb200000000000000000000fd2f87532b90095211` | Yes |
| PLTRc | `0xb2000000000000000000007d16372840df4dabbe` | Yes |
| AMDc | `0xb2000000000000000000000d8ce462e99ee7a47b` | Yes |
| RDDTc | `0xb20000000000000000000066242d4067724cb7a1` | Yes |
| NFLXc | `0xb20000000000000000000058b8c947e44011dfe6` | Yes |
| ORCLc | `0xb200000000000000000000347afba223d7b6b63c` | Yes |
| TTWOc | `0xb200000000000000000000f720c26062bc3067da` | Yes |
| MRNAc | `0xb200000000000000000000e215e9b76ecba02468` | Yes |
| GMEc | `0xb2000000000000000000007790ed6e48e06ed935` | Yes |
| LLYc | `0xb200000000000000000000f1a0f91e34892e4718` | Yes |
| BEc | `0xb20000000000000000000016f9dfe862feba122b` | Yes |
| MRVLc | `0xb200000000000000000000ec3c4c7395cc609813` | Yes |
| DJTc | `0xb200000000000000000000428e3a3eebbb20692b` | Yes |
| RBLXc | `0xb2000000000000000000005bd7ae89b9e6189bb5` | Yes |
| AVGOc | `0xb200000000000000000000fc737aea6196ab5a4c` | Yes |
| PYPLc | `0xb200000000000000000000450ad3abe5d4846c6e` | Yes |
| ASTSc | `0xb200000000000000000000b1a29cf17a1819288a` | Yes |
| QUBTc | `0xb200000000000000000000ca425ab42e07c35bc3` | Yes |
| HTZc | `0xb2000000000000000000002601c5c94f435da168` | Yes |
| DKNGc | `0xb2000000000000000000009b870441031d4d8a41` | Yes |
| WENc | `0xb20000000000000000000044e3cd7a0e1028e57a` | Pool pending |
| DUOLc | `0xb200000000000000000000a613d12deafbbb1db7` | Pool pending |
| NVAXc | `0xb200000000000000000000c597c476fcf9aed3a8` | Pool pending |
| PFEc | `0xb20000000000000000000018fe7ec7d6dfeeb528` | Pool pending |
| SOUNc | `0xb2000000000000000000002137743d4a01fe4e88` | Pool pending |
| PTONc | `0xb2000000000000000000009272a491812842aa84` | Pool pending |
| PMc | `0xb2000000000000000000008fc2a8c23cf5937b66` | Pool pending |
| CAKEc | `0xb200000000000000000000f215e4c890cfb7176b` | Pool pending |

Each new entry passed a Base mainnet multicall for exact `name`, `symbol`, `decimals = 8`, and non-zero `totalSupply` during this review. Secondary-market status was cross-checked against the Base-wide Stockify market snapshot. Stockify was used only to discover the current cohort; Daybreak verifies identity and supply onchain and uses Coinbase's official endpoint for reference NAV.

## Primary references

- [Base integration guide](https://docs.base.org/build-on-base/integrate-defi/list-tokenized-stocks)
- [Coinbase Tokenized Stocks API](https://docs.base.org/sdks/tokenized-stocks/api-reference/list-tokenized-stocks)
- [Coinbase Tokenize](https://www.coinbase.com/tokenize)
- [Base announcement](https://blog.base.org/tokenized-stocks)

## Campaign asset

`public/assets/posters/base-stocks-wave-2026-09-30.png` is a 1122×1402 launch poster generated from Daybreak's existing plush, chrome, cobalt campaign language. It announces the 28-stock expansion and features a representative orbit of recognizable company logo marks.

Prompt summary: preserve Daybreak's plush mascot, cobalt stage, chrome orbit, cloud horizon, and sunrise lighting; replace ticker labels on the orbiting tiles with centered company logo emblems; keep the composition restrained; preserve “28 NEW STOCKS. ONE DAYBREAK.” and “COINBASE TOKENIZED STOCKS • BASE” in the calm upper field.
