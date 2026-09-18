import 'server-only';
import { COMPANY_BY_ID, PRESTOCK_INSTRUMENTS } from '@/lib/assets/companies';

// PreStocks tokenized PRE-IPO companies on SOLANA — verified on-chain 2026-09-17 via
// getMultipleAccounts + the PreStocks public API (https://prestocks.com/api/prestocks).
//
// VERIFIED FACTS (read on-chain, not assumed):
// - All 8 mints are owned by the Token-2022 program (same family as xStocks).
// - decimals = 9 for all (xStocks are 8 — do not copy that value).
// - Each mint carries the Scaled UI Amount extension: the RPC-reported uiAmount is
//   already scaled, so use it directly (same handling as xStocks holdings).
// - PreStocks disclaims all legal rights: tokens "confer no ownership, voting,
//   dividend, information, or other legal rights" and are "backed 1:1 by SPV
//   exposure". Surface this in the UI (see PreStocksFacts note below).
// Identity is the MINT (case-sensitive), never the symbol.

import { TOKEN_2022_PROGRAM_ID, USDC_SOLANA_MINT } from './xstocks-registry';
export { TOKEN_2022_PROGRAM_ID, USDC_SOLANA_MINT };

export interface PreStock {
  symbol: string;   // PreStocks token symbol, e.g. ANTHROPIC
  company: string;  // display name (without the "PreStocks" suffix)
  mint: string;     // Solana mint (canonical identity, case-sensitive)
  decimals: number; // 9 (verified on-chain)
  image: string;    // logo URL from the PreStocks API
  externalUrl: string; // PreStocks product page
  // GDELT keyword used for the pre-IPO news lane. These are private companies, so
  // Finnhub company-news does not cover them — news is keyword-based (see prestocks-news.ts).
  newsQuery: string;
}

export const PRESTOCK_HAS_SCALED_UI_AMOUNT = true;
export const PRESTOCKS_VERIFIED_AT = '2026-09-17';

export const PRESTOCKS: PreStock[] = PRESTOCK_INSTRUMENTS.map((instrument) => {
  const company = COMPANY_BY_ID[instrument.companyId];
  if (!company || !instrument.image || !instrument.externalUrl || !instrument.newsQuery) throw new Error(`Invalid PreStocks registry entry: ${instrument.identity}`);
  return { symbol: instrument.symbol, company: company.name, mint: instrument.identity, decimals: instrument.decimals, image: instrument.image, externalUrl: instrument.externalUrl, newsQuery: instrument.newsQuery };
});

export const PRESTOCK_BY_SYMBOL: Record<string, PreStock> = Object.fromEntries(PRESTOCKS.map((p) => [p.symbol, p]));
export const PRESTOCK_BY_MINT: Record<string, PreStock> = Object.fromEntries(PRESTOCKS.map((p) => [p.mint, p]));
export function prestockBySymbol(symbol: string): PreStock | undefined { return PRESTOCK_BY_SYMBOL[symbol.toUpperCase()]; }
export function prestockByMint(mint: string): PreStock | undefined { return PRESTOCK_BY_MINT[mint]; } // case-sensitive; do not lowercase

// PreStocks' own disclaimer, shown verbatim-in-spirit in the UI compliance note.
export const PRESTOCKS_RIGHTS_NOTE = 'PreStocks tokens are backed 1:1 by SPV exposure and confer no ownership, voting, dividend, information, or other legal rights.';
