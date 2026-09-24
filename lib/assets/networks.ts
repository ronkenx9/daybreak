import { TOKENS } from '@/lib/base/tokens';
import { SOLANA_XSTOCK_INSTRUMENTS, companyForSymbol } from '@/lib/assets/companies';
import { XLAYER_STOCKS } from '@/lib/xlayer/tokens';

// Which chains carry a verified stock token for a company, in display order (X Layer first).
// Client-safe: derived only from the reviewed registries.
export type StockNetwork = 'xlayer' | 'base' | 'solana';
export const STOCK_NETWORK_LABEL: Record<StockNetwork, string> = { xlayer: 'X Layer', base: 'Base', solana: 'Solana' };

export function networksForTicker(ticker: string): StockNetwork[] {
  const t = ticker.toUpperCase();
  const companyId = companyForSymbol(t)?.id;
  const out: StockNetwork[] = [];
  if (XLAYER_STOCKS.some((s) => s.ticker === t)) out.push('xlayer');
  if (TOKENS.some((s) => s.ticker === t)) out.push('base');
  if (companyId && SOLANA_XSTOCK_INSTRUMENTS.some((i) => i.companyId === companyId)) out.push('solana');
  return out;
}
