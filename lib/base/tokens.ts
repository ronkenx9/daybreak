/** Reviewed against Base technical listings and read-only metadata at block 50934962,
 * 2026-09-06. Token and feed identity are also validated on each live read.
 * This is an issuer allowlist, not every token on Base. */
export const BASE_CHAIN_ID = 8453;

export interface StockToken {
  ticker: string; // real-world ticker, e.g. "AAPL"
  onchainSymbol: string; // B20 token symbol, e.g. "AAPLc"
  name: string;
  token: `0x${string}`; // B20 token contract (holdings are read here)
  feed: `0x${string}`; // Chainlink price feed (price is read here)
  decimals: number; // token decimals (8 for every Coinbase stock token)
  verified: boolean;
}

export const TOKENS: StockToken[] = [
  { ticker: 'AAPL', onchainSymbol: 'AAPLc', name: 'Apple', token: '0xb200000000000000000000C2e324d24d7eEcd1fb', feed: '0x787f13dEa48Db0897CbCDD985de77809D837F988', decimals: 8, verified: true },
  { ticker: 'AMZN', onchainSymbol: 'AMZNc', name: 'Amazon', token: '0xb200000000000000000000d9192b6B456483C2E8', feed: '0x06A8E4b3aBB3B7543d8396FB2B763d22820cB295', decimals: 8, verified: true },
  { ticker: 'GOOGL', onchainSymbol: 'GOOGLc', name: 'Alphabet', token: '0xb2000000000000000000002D0BA3164cc74f58B7', feed: '0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2', decimals: 8, verified: true },
  { ticker: 'NVDA', onchainSymbol: 'NVDAc', name: 'NVIDIA', token: '0xb20000000000000000000078ee7ce2fE4908108C', feed: '0x04689a41629776563E6822F76f2e57D148d28513', decimals: 8, verified: true },
  { ticker: 'TSLA', onchainSymbol: 'TSLAc', name: 'Tesla', token: '0xb2000000000000000000001e800a7f5189430cD0', feed: '0xFaf869185383a24F8cb00e27BdA6b63B9905DCb4', decimals: 8, verified: true },
  { ticker: 'META', onchainSymbol: 'METAc', name: 'Meta', token: '0xb2000000000000000000008bC8786B856E61707C', feed: '0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D', decimals: 8, verified: true },
  { ticker: 'MSFT', onchainSymbol: 'MSFTc', name: 'Microsoft', token: '0xB200000000000000000000Ab99cFa739E253872B', feed: '0xeB10A6c9aa7E537aEd766C08c35Dae35B321b18c', decimals: 8, verified: true },
  { ticker: 'COIN', onchainSymbol: 'COINc', name: 'Coinbase', token: '0xb200000000000000000000c85a31389D71F3ecfb', feed: '0x408e44f504A7371a345F03a73dDC96A4b48e8aa7', decimals: 8, verified: true },
  { ticker: 'CRCL', onchainSymbol: 'CRCLc', name: 'Circle', token: '0xB20000000000000000000019f6E7C675b73C2e4D', feed: '0x0231cF2635D1E17bB5c2462cc7504Ba1fBd61f33', decimals: 8, verified: true },
  { ticker: 'INTC', onchainSymbol: 'INTCc', name: 'Intel', token: '0xB2000000000000000000004AFF16039bA04bdFBc', feed: '0xAB657C39bac0D5886250D70849e2E3E008F2EECB', decimals: 8, verified: true },
  { ticker: 'MSTR', onchainSymbol: 'MSTRc', name: 'MicroStrategy', token: '0xb2000000000000000000004884b426556b92883d', feed: '0xB3cE282CD188b35DA0E38D8Bc7d58e33173D202a', decimals: 8, verified: true },
  { ticker: 'SNDK', onchainSymbol: 'SNDKc', name: 'SanDisk', token: '0xb200000000000000000000397293Cb8cda9a10c5', feed: '0x388b0dC46C0Fb05A74BeE0994fa5b02c6Fcca2eA', decimals: 8, verified: true },
  { ticker: 'SPCX', onchainSymbol: 'SPCXc', name: 'SpaceX', token: '0xb2000000000000000000007b9fcbd005511aCBd5', feed: '0x6A634B235903C4ad6376892180d6fF8612e3Fa68', decimals: 8, verified: true },
];

export const TOKEN_BY_TICKER: Record<string, StockToken> = Object.fromEntries(
  TOKENS.map((t) => [t.ticker, t]),
);

export function tokenForTicker(ticker: string): StockToken | undefined {
  return TOKEN_BY_TICKER[ticker.toUpperCase()];
}

/** Central B20 registry holding each token's multiplier and pause flags. */
export const ONCHAIN_REGISTRY: `0x${string}` = '0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD';

export const STOCK_SOURCE_URL = 'https://docs.base.org/specifications/b20/tokenized-stocks-on-base';
export const ISSUER_URL = 'https://www.coinbase.com/tokenize';
export const REGISTRY_CHECKED_AT = '2026-09-06';
export function buyUrl(token:StockToken){
 const known=TOKENS.find(t=>t.token.toLowerCase()===token.token.toLowerCase());
 if(!known)throw Error('Unsupported token');
 return `https://app.uniswap.org/swap?chain=base&outputCurrency=${known.token}`;
}
