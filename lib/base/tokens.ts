/** Coinbase-issued B20 stocks with non-zero supply on Base, verified with
 * read-only name/symbol/decimals/totalSupply calls on 2026-09-30. The first
 * cohort has documented Chainlink feeds; newer prices come from Coinbase's
 * official Tokenized Stocks API until the feed table catches up. */
export const BASE_CHAIN_ID = 8453;

export interface StockToken {
  ticker: string; // real-world ticker, e.g. "AAPL"
  onchainSymbol: string; // B20 token symbol, e.g. "AAPLc"
  name: string;
  token: `0x${string}`; // B20 token contract (holdings are read here)
  feed?: `0x${string}`; // Documented Chainlink feed, when published by Base
  decimals: number; // token decimals (8 for every Coinbase stock token)
  verified: boolean;
  tradeable: boolean; // an active secondary-market pool was observed at review
}

export const TOKENS: StockToken[] = [
  { ticker: 'AAPL', onchainSymbol: 'AAPLc', name: 'Apple', token: '0xb200000000000000000000C2e324d24d7eEcd1fb', feed: '0x787f13dEa48Db0897CbCDD985de77809D837F988', decimals: 8, verified: true, tradeable: true },
  { ticker: 'AMZN', onchainSymbol: 'AMZNc', name: 'Amazon', token: '0xb200000000000000000000d9192b6B456483C2E8', feed: '0x06A8E4b3aBB3B7543d8396FB2B763d22820cB295', decimals: 8, verified: true, tradeable: true },
  { ticker: 'GOOGL', onchainSymbol: 'GOOGLc', name: 'Alphabet', token: '0xb2000000000000000000002D0BA3164cc74f58B7', feed: '0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2', decimals: 8, verified: true, tradeable: true },
  { ticker: 'NVDA', onchainSymbol: 'NVDAc', name: 'NVIDIA', token: '0xb20000000000000000000078ee7ce2fE4908108C', feed: '0x04689a41629776563E6822F76f2e57D148d28513', decimals: 8, verified: true, tradeable: true },
  { ticker: 'TSLA', onchainSymbol: 'TSLAc', name: 'Tesla', token: '0xb2000000000000000000001e800a7f5189430cD0', feed: '0xFaf869185383a24F8cb00e27BdA6b63B9905DCb4', decimals: 8, verified: true, tradeable: true },
  { ticker: 'META', onchainSymbol: 'METAc', name: 'Meta', token: '0xb2000000000000000000008bC8786B856E61707C', feed: '0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D', decimals: 8, verified: true, tradeable: true },
  { ticker: 'MSFT', onchainSymbol: 'MSFTc', name: 'Microsoft', token: '0xB200000000000000000000Ab99cFa739E253872B', feed: '0xeB10A6c9aa7E537aEd766C08c35Dae35B321b18c', decimals: 8, verified: true, tradeable: true },
  { ticker: 'MSTR', onchainSymbol: 'MSTRc', name: 'Strategy', token: '0xb2000000000000000000004884b426556b92883d', feed: '0xB3cE282CD188b35DA0E38D8Bc7d58e33173D202a', decimals: 8, verified: true, tradeable: true },
  { ticker: 'SNDK', onchainSymbol: 'SNDKc', name: 'SanDisk', token: '0xb200000000000000000000397293Cb8cda9a10c5', feed: '0x388b0dC46C0Fb05A74BeE0994fa5b02c6Fcca2eA', decimals: 8, verified: true, tradeable: true },
  { ticker: 'SPCX', onchainSymbol: 'SPCXc', name: 'SpaceX', token: '0xb2000000000000000000007b9fcbd005511aCBd5', feed: '0x6A634B235903C4ad6376892180d6fF8612e3Fa68', decimals: 8, verified: true, tradeable: true },
  { ticker: 'MU', onchainSymbol: 'MUc', name: 'Micron Technology', token: '0xb200000000000000000000fd2f87532b90095211', decimals: 8, verified: true, tradeable: true },
  { ticker: 'PLTR', onchainSymbol: 'PLTRc', name: 'Palantir', token: '0xb2000000000000000000007d16372840df4dabbe', decimals: 8, verified: true, tradeable: true },
  { ticker: 'AMD', onchainSymbol: 'AMDc', name: 'AMD', token: '0xb2000000000000000000000d8ce462e99ee7a47b', decimals: 8, verified: true, tradeable: true },
  { ticker: 'RDDT', onchainSymbol: 'RDDTc', name: 'Reddit', token: '0xb20000000000000000000066242d4067724cb7a1', decimals: 8, verified: true, tradeable: true },
  { ticker: 'NFLX', onchainSymbol: 'NFLXc', name: 'Netflix', token: '0xb20000000000000000000058b8c947e44011dfe6', decimals: 8, verified: true, tradeable: true },
  { ticker: 'ORCL', onchainSymbol: 'ORCLc', name: 'Oracle', token: '0xb200000000000000000000347afba223d7b6b63c', decimals: 8, verified: true, tradeable: true },
  { ticker: 'TTWO', onchainSymbol: 'TTWOc', name: 'Take-Two Interactive', token: '0xb200000000000000000000f720c26062bc3067da', decimals: 8, verified: true, tradeable: true },
  { ticker: 'MRNA', onchainSymbol: 'MRNAc', name: 'Moderna', token: '0xb200000000000000000000e215e9b76ecba02468', decimals: 8, verified: true, tradeable: true },
  { ticker: 'GME', onchainSymbol: 'GMEc', name: 'GameStop', token: '0xb2000000000000000000007790ed6e48e06ed935', decimals: 8, verified: true, tradeable: true },
  { ticker: 'LLY', onchainSymbol: 'LLYc', name: 'Eli Lilly', token: '0xb200000000000000000000f1a0f91e34892e4718', decimals: 8, verified: true, tradeable: true },
  { ticker: 'BE', onchainSymbol: 'BEc', name: 'Bloom Energy', token: '0xb20000000000000000000016f9dfe862feba122b', decimals: 8, verified: true, tradeable: true },
  { ticker: 'MRVL', onchainSymbol: 'MRVLc', name: 'Marvell Technology', token: '0xb200000000000000000000ec3c4c7395cc609813', decimals: 8, verified: true, tradeable: true },
  { ticker: 'DJT', onchainSymbol: 'DJTc', name: 'Trump Media', token: '0xb200000000000000000000428e3a3eebbb20692b', decimals: 8, verified: true, tradeable: true },
  { ticker: 'RBLX', onchainSymbol: 'RBLXc', name: 'Roblox', token: '0xb2000000000000000000005bd7ae89b9e6189bb5', decimals: 8, verified: true, tradeable: true },
  { ticker: 'AVGO', onchainSymbol: 'AVGOc', name: 'Broadcom', token: '0xb200000000000000000000fc737aea6196ab5a4c', decimals: 8, verified: true, tradeable: true },
  { ticker: 'PYPL', onchainSymbol: 'PYPLc', name: 'PayPal', token: '0xb200000000000000000000450ad3abe5d4846c6e', decimals: 8, verified: true, tradeable: true },
  { ticker: 'ASTS', onchainSymbol: 'ASTSc', name: 'AST SpaceMobile', token: '0xb200000000000000000000b1a29cf17a1819288a', decimals: 8, verified: true, tradeable: true },
  { ticker: 'QUBT', onchainSymbol: 'QUBTc', name: 'Quantum Computing', token: '0xb200000000000000000000ca425ab42e07c35bc3', decimals: 8, verified: true, tradeable: true },
  { ticker: 'HTZ', onchainSymbol: 'HTZc', name: 'Hertz', token: '0xb2000000000000000000002601c5c94f435da168', decimals: 8, verified: true, tradeable: true },
  { ticker: 'DKNG', onchainSymbol: 'DKNGc', name: 'DraftKings', token: '0xb2000000000000000000009b870441031d4d8a41', decimals: 8, verified: true, tradeable: true },
  { ticker: 'WEN', onchainSymbol: 'WENc', name: "Wendy's", token: '0xb20000000000000000000044e3cd7a0e1028e57a', decimals: 8, verified: true, tradeable: false },
  { ticker: 'DUOL', onchainSymbol: 'DUOLc', name: 'Duolingo', token: '0xb200000000000000000000a613d12deafbbb1db7', decimals: 8, verified: true, tradeable: false },
  { ticker: 'NVAX', onchainSymbol: 'NVAXc', name: 'Novavax', token: '0xb200000000000000000000c597c476fcf9aed3a8', decimals: 8, verified: true, tradeable: false },
  { ticker: 'PFE', onchainSymbol: 'PFEc', name: 'Pfizer', token: '0xb20000000000000000000018fe7ec7d6dfeeb528', decimals: 8, verified: true, tradeable: false },
  { ticker: 'SOUN', onchainSymbol: 'SOUNc', name: 'SoundHound AI', token: '0xb2000000000000000000002137743d4a01fe4e88', decimals: 8, verified: true, tradeable: false },
  { ticker: 'PTON', onchainSymbol: 'PTONc', name: 'Peloton', token: '0xb2000000000000000000009272a491812842aa84', decimals: 8, verified: true, tradeable: false },
  { ticker: 'PM', onchainSymbol: 'PMc', name: 'Philip Morris', token: '0xb2000000000000000000008fc2a8c23cf5937b66', decimals: 8, verified: true, tradeable: false },
  { ticker: 'CAKE', onchainSymbol: 'CAKEc', name: 'Cheesecake Factory', token: '0xb200000000000000000000f215e4c890cfb7176b', decimals: 8, verified: true, tradeable: false },
];

export const TOKEN_BY_TICKER: Record<string, StockToken> = Object.fromEntries(
  TOKENS.map((t) => [t.ticker, t]),
);

export function tokenForTicker(ticker: string): StockToken | undefined {
  return TOKEN_BY_TICKER[ticker.toUpperCase()];
}

/** Central B20 registry holding each token's multiplier and pause flags. */
export const ONCHAIN_REGISTRY: `0x${string}` = '0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD';

export const STOCK_SOURCE_URL = 'https://docs.base.org/build-on-base/integrate-defi/list-tokenized-stocks';
export const ISSUER_URL = 'https://www.coinbase.com/tokenize';
export const REGISTRY_CHECKED_AT = '2026-09-30';
export function buyUrl(token:StockToken){
 const known=TOKENS.find(t=>t.token.toLowerCase()===token.token.toLowerCase());
 if(!known)throw Error('Unsupported token');
 return `https://app.uniswap.org/swap?chain=base&outputCurrency=${known.token}`;
}
