import { companyForSymbol, SOLANA_XSTOCK_INSTRUMENTS } from '@/lib/assets/companies';

export function thesisCompanyId(ticker: string): string | null {
  const company = companyForSymbol(ticker);
  if (!company || !SOLANA_XSTOCK_INSTRUMENTS.some(instrument => instrument.companyId === company.id)) return null;
  return company.id;
}

export function companyThesesForTicker<T extends { companyId: string }>(ticker: string, items: T[], limit = items.length): T[] {
  const companyId = thesisCompanyId(ticker);
  return companyId ? items.filter(item => item.companyId === companyId).slice(0, limit) : [];
}
