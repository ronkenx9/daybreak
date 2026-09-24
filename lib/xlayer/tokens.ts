/** xStocks (Backed / Kraken) tokenized equities on X Layer (eip155:196).
 * Addresses come from the xStocks public asset API (network "XLayer") and were
 * read on X Layer mainnet at block 71484700 on 2026-09-24: every token returned
 * its expected symbol and 18 decimals, and every ERC-4626 wrapper returned
 * asset() == token. Re-check with scripts/verify-xlayer-stocks.mjs.
 * This is an issuer allowlist, not every token on X Layer. */
export const XLAYER_CHAIN_ID = 196;
export const XLAYER_NAMESPACE = 'eip155:196';
export const XLAYER_EXPLORER = 'https://www.oklink.com/xlayer';

export interface XLayerStock {
  ticker: string; // underlying ticker, e.g. "TSLA"
  symbol: string; // xStocks token symbol, e.g. "TSLAx"
  name: string;
  isin: string; // Backed product ISIN (same product on every chain)
  token: `0x${string}`; // rebasing xStock ERC-20 (18 decimals)
  wrapper: `0x${string}`; // non-rebasing ERC-4626 wrapper ("wTSLAx") used by DEX pools
  companyId: string | null; // Daybreak company id where one exists
}

export const XLAYER_STOCK_DECIMALS = 18;

export const XLAYER_STOCKS: XLayerStock[] = [
  { ticker: 'TSLA', symbol: 'TSLAx', name: 'Tesla', isin: 'CH1436219252', token: '0x8ad3c73f833d3f9a523ab01476625f269aeb7cf0', wrapper: '0xc3fdbe3a68ee5de461d30415a8165cf9aefe1171', companyId: 'tesla' },
  { ticker: 'NVDA', symbol: 'NVDAx', name: 'NVIDIA', isin: 'CH1436219195', token: '0xc845b2894dbddd03858fd2d643b4ef725fe0849d', wrapper: '0xa8ddb5cd96b5222afe198316e9a57caa642850d5', companyId: 'nvidia' },
  { ticker: 'AAPL', symbol: 'AAPLx', name: 'Apple', isin: 'CH1436219187', token: '0x9d275685dc284c8eb1c79f6aba7a63dc75ec890a', wrapper: '0x943bf64d566c32a2bcd41ac92fb63c111cc9de8f', companyId: 'apple' },
  { ticker: 'MSFT', symbol: 'MSFTx', name: 'Microsoft', isin: 'CH1436219203', token: '0x5621737f42dae558b81269fcb9e9e70c19aa6b35', wrapper: '0x166fbe68274b6a47e025f4ba17388c539f1fa1d0', companyId: 'microsoft' },
  { ticker: 'AMZN', symbol: 'AMZNx', name: 'Amazon.com', isin: 'CH1436219211', token: '0x3557ba345b01efa20a1bddc61f573bfd87195081', wrapper: '0x910cabde3eba7fc1ce64fd14bd680b9f60fa0f90', companyId: 'amazon' },
  { ticker: 'GOOGL', symbol: 'GOOGLx', name: 'Alphabet', isin: 'CH1436219237', token: '0xe92f673ca36c5e2efd2de7628f815f84807e803f', wrapper: '0xf8c5308f80e459bb53d9ebe689854d9cbb2caa6f', companyId: 'alphabet' },
  { ticker: 'META', symbol: 'METAx', name: 'Meta', isin: 'CH1436219229', token: '0x96702be57cd9777f835117a809c7124fe4ec989a', wrapper: '0xe840946ffebcd66b7c4e95095effafadfa0d0e56', companyId: 'meta' },
  { ticker: 'MSTR', symbol: 'MSTRx', name: 'MicroStrategy', isin: 'CH1436219633', token: '0xae2f842ef90c0d5213259ab82639d5bbf649b08e', wrapper: '0x30987adf0b11dc698438a99ba04ec3a1ab2c7eab', companyId: 'microstrategy' },
  { ticker: 'COIN', symbol: 'COINx', name: 'Coinbase', isin: 'CH1436219708', token: '0x364f210f430ec2448fc68a49203040f6124096f0', wrapper: '0x44c7ed7ffdf8465c9d27f60aec845eed3d49d56e', companyId: 'coinbase' },
  { ticker: 'CRCL', symbol: 'CRCLx', name: 'Circle', isin: 'CH1436219773', token: '0xfebded1b0986a8ee107f5ab1a1c5a813491deceb', wrapper: '0xb11134f14d5b94db60d4599dfdc3bf1bba2150e8', companyId: 'circle' },
  { ticker: 'SPY', symbol: 'SPYx', name: 'S&P 500 ETF', isin: 'CH1436219716', token: '0x90a2a4c76b5d8c0bc892a69ea28aa775a8f2dd48', wrapper: '0xe7e553cd128f0011777323a0b44a7b96ea1cb540', companyId: null },
  { ticker: 'QQQ', symbol: 'QQQx', name: 'Nasdaq-100 ETF', isin: 'CH1436219724', token: '0xa753a7395cae905cd615da0b82a53e0560f250af', wrapper: '0x4c1ae29c159838fc1b224636e28e086eb69101f7', companyId: null },
  { ticker: 'HOOD', symbol: 'HOODx', name: 'Robinhood', isin: 'CH1436219666', token: '0xe1385fdd5ffb10081cd52c56584f25efa9084015', wrapper: '0x59801175a9b2248f9bf4ba7f82e17045c4672ec8', companyId: null },
  { ticker: 'PLTR', symbol: 'PLTRx', name: 'Palantir', isin: 'CH1436219625', token: '0x6d482cec5f9dd1f05ccee9fd3ff79b246170f8e2', wrapper: '0x4a2df09536f62341c9f946427d16414c04e21342', companyId: null },
  { ticker: 'GME', symbol: 'GMEx', name: 'GameStop', isin: 'CH1436219690', token: '0xe5f6d3b2405abdfe6f660e63202b25d23763160d', wrapper: '0x459d3ae62b86cc6125e06260dddfd3afed24a877', companyId: null },
  { ticker: 'AMD', symbol: 'AMDx', name: 'AMD', isin: 'CH1473121254', token: '0x3522513e5f146a2006e2901b05f16b2821485e19', wrapper: '0xee7ccb0d37a12862e7f92f6c92a93d9c2d304266', companyId: null },
  { ticker: 'NFLX', symbol: 'NFLXx', name: 'Netflix', isin: 'CH1436219526', token: '0xa6a65ac27e76cd53cb790473e4345c46e5ebf961', wrapper: '0x7d87fd6a379714194a797c0bbb8b40c30d250856', companyId: null },
  { ticker: 'GLD', symbol: 'GLDx', name: 'Gold ETF', isin: 'CH1436219740', token: '0x2380f2673c640fb67e2d6b55b44c62f0e0e69da9', wrapper: '0x735f1509bff25e27cd442b9bfb231324648ead9b', companyId: null },
  { ticker: 'INTC', symbol: 'INTCx', name: 'Intel', isin: 'CH1436219609', token: '0xf8a80d1cb9cfd70d03d655d9df42339846f3b3c8', wrapper: '0x33aa35b0271fffe2048cc093ab7fe60931786719', companyId: 'intel' },
  { ticker: 'ORCL', symbol: 'ORCLx', name: 'Oracle', isin: 'CH1436219450', token: '0x548308e91ec9f285c7bff05295badbd56a6e4971', wrapper: '0x1349456830ddc3d8599e4d6a63698883eca67ada', companyId: null },
];

/** Settlement stablecoins the issuer supports for xStocks on X Layer (6 decimals). */
export const XLAYER_STABLECOINS = {
  USDC: '0xb6ceceab302e2e4948951ee7843fc24e92933061',
  USDG: '0x4ae46a509f6b1d9056937ba4500cb143933d2dc8',
} as const;

export const XLAYER_STOCKS_VERIFIED_AT = '2026-09-24';
export const XLAYER_STOCKS_VERIFIED_BLOCK = 71484700;
export const XLAYER_STOCKS_SOURCE = 'https://api.xstocks.fi/api/v2/public/assets';

const BY_TICKER: Record<string, XLayerStock> = Object.fromEntries(XLAYER_STOCKS.map((s) => [s.ticker, s]));
const BY_SYMBOL: Record<string, XLayerStock> = Object.fromEntries(XLAYER_STOCKS.map((s) => [s.symbol.toUpperCase(), s]));

/** Accepts an underlying ticker ("TSLA"), xStocks symbol ("TSLAx") or wrapper symbol ("wTSLAx"). */
export function xlayerStockFor(query: string): XLayerStock | undefined {
  const q = query.trim().toUpperCase();
  return BY_TICKER[q] ?? BY_SYMBOL[q] ?? (q.startsWith('W') ? BY_SYMBOL[q.slice(1)] : undefined);
}

export function xlayerExplorerUrl(address: string): string {
  return `${XLAYER_EXPLORER}/token/${address}`;
}
