import { companyForSymbol, type CompanyNewsProvider } from '@/lib/assets/companies';

export interface CompanyNewsTarget {
  companyId: string;
  symbol: string;
  newsProvider: CompanyNewsProvider;
}

// Circle requirements can contain several instruments for one company (SPCX on
// Base and SPACEX on PreStocks). News is company-scoped, so emit one canonical
// target and never duplicate a story lane because the user holds both.
export function companyNewsTargets(symbols: string[]): CompanyNewsTarget[] {
  const targets = new Map<string, CompanyNewsTarget>();
  for (const symbol of symbols) {
    const company = companyForSymbol(symbol);
    if (!company || company.newsProvider === 'none' || targets.has(company.id)) continue;
    targets.set(company.id, { companyId: company.id, symbol: company.symbol, newsProvider: company.newsProvider });
  }
  return [...targets.values()];
}
