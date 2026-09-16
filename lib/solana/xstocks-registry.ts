import 'server-only';

// xStocks (Backed Finance) tokenized equities on SOLANA — verified on-chain
// 2026-09-16 via Solana mainnet getAccountInfo + the xStocks public asset API.
//
// VERIFIED FACTS (do not assume; these were read on-chain):
// - Every mint is owned by the Token-2022 program (NOT classic SPL). The xStocks
//   API metadata field "solanaTokenProgram: TokenProgram" is misleading — trust
//   the chain. Owner = TOKEN_2022_PROGRAM_ID below.
// - decimals = 8 for all.
// - Each mint carries the Scaled UI Amount extension (scaledUiAmountConfig): the
//   displayed quantity is raw * a time-aware multiplier — apply the scale exactly
//   once when showing balances. Also present: permanentDelegate, pausableConfig,
//   transferHook, confidentialTransferMint, defaultAccountState, metadataPointer.
// Identity is the MINT, never the ticker or the StonkFun alias.

export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

export interface XStock {
  ticker: string;      // underlying equity ticker, e.g. AAPL
  company: string;     // display name
  xSymbol: string;     // xStocks token symbol, e.g. AAPLx
  isin: string;        // Backed product ISIN
  mint: string;        // Solana mint (canonical identity)
  decimals: number;    // 8 (verified)
}

// All mints are Token-2022 with the Scaled UI Amount extension (verified on-chain).
export const XSTOCK_HAS_SCALED_UI_AMOUNT = true;

export const XSTOCKS: XStock[] = [
  { ticker: 'AAPL', company: 'Apple', xSymbol: 'AAPLx', isin: 'CH1436219187', mint: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp', decimals: 8 },
  { ticker: 'AMZN', company: 'Amazon', xSymbol: 'AMZNx', isin: 'CH1436219211', mint: 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg', decimals: 8 },
  { ticker: 'GOOGL', company: 'Alphabet', xSymbol: 'GOOGLx', isin: 'CH1436219237', mint: 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN', decimals: 8 },
  { ticker: 'NVDA', company: 'NVIDIA', xSymbol: 'NVDAx', isin: 'CH1436219195', mint: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh', decimals: 8 },
  { ticker: 'TSLA', company: 'Tesla', xSymbol: 'TSLAx', isin: 'CH1436219252', mint: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB', decimals: 8 },
  { ticker: 'META', company: 'Meta', xSymbol: 'METAx', isin: 'CH1436219229', mint: 'Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu', decimals: 8 },
  { ticker: 'MSFT', company: 'Microsoft', xSymbol: 'MSFTx', isin: 'CH1436219203', mint: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX', decimals: 8 },
  { ticker: 'COIN', company: 'Coinbase', xSymbol: 'COINx', isin: 'CH1436219708', mint: 'Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu', decimals: 8 },
  { ticker: 'INTC', company: 'Intel', xSymbol: 'INTCx', isin: 'CH1436219609', mint: 'XshPgPdXFRWB8tP1j82rebb2Q9rPgGX37RuqzohmArM', decimals: 8 },
  { ticker: 'MSTR', company: 'MicroStrategy', xSymbol: 'MSTRx', isin: 'CH1436219633', mint: 'XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ', decimals: 8 },
];

export const XSTOCK_BY_TICKER: Record<string, XStock> = Object.fromEntries(XSTOCKS.map((x) => [x.ticker, x]));
export const XSTOCK_BY_MINT: Record<string, XStock> = Object.fromEntries(XSTOCKS.map((x) => [x.mint, x]));
export function xstockByTicker(ticker: string): XStock | undefined { return XSTOCK_BY_TICKER[ticker.toUpperCase()]; }
export function xstockByMint(mint: string): XStock | undefined { return XSTOCK_BY_MINT[mint]; } // Solana mints are case-sensitive; do not lowercase
export const XSTOCKS_VERIFIED_AT = '2026-09-16';
