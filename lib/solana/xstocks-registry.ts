import 'server-only';
import { COMPANY_BY_ID, SOLANA_XSTOCK_INSTRUMENTS } from '@/lib/assets/companies';

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
// USDC on Solana (6 decimals) — the quote currency for xStock swaps.
export const USDC_SOLANA_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

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

export const XSTOCKS: XStock[] = SOLANA_XSTOCK_INSTRUMENTS.map((instrument) => {
  const company = COMPANY_BY_ID[instrument.companyId];
  if (!company || !instrument.isin) throw new Error(`Invalid xStock registry entry: ${instrument.identity}`);
  return {
    ticker: company.ticker, company: company.name, xSymbol: instrument.symbol,
    isin: instrument.isin, mint: instrument.identity, decimals: instrument.decimals,
  };
});

export const XSTOCK_BY_TICKER: Record<string, XStock> = Object.fromEntries(XSTOCKS.map((x) => [x.ticker, x]));
export const XSTOCK_BY_MINT: Record<string, XStock> = Object.fromEntries(XSTOCKS.map((x) => [x.mint, x]));
export function xstockByTicker(ticker: string): XStock | undefined { return XSTOCK_BY_TICKER[ticker.toUpperCase()]; }
export function xstockByMint(mint: string): XStock | undefined { return XSTOCK_BY_MINT[mint]; } // Solana mints are case-sensitive; do not lowercase
export const XSTOCKS_VERIFIED_AT = '2026-09-16';
