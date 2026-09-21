import { COMPANIES, COMPANY_INSTRUMENTS } from '@/lib/assets/companies';

export const OKX_PUBLIC_TOOLS = [
  { name: 'discover_stock_tokens', description: 'Find canonical Daybreak company and stock-token identities.' },
  { name: 'get_stock_market_data', description: 'Read timestamped USD equity reference prices; these are not executable token quotes.' },
  { name: 'get_company_context', description: 'Read sourced headlines and public Circle metadata for a company.' },
  { name: 'find_theses', description: 'Search public Daybreak conviction markets across paper and live modes.' },
  { name: 'get_thesis', description: 'Read one public conviction thesis.' },
  { name: 'get_thesis_activity', description: 'Read bounded public paper market activity.' },
] as const;

export const OKX_CONNECTED_TOOLS = [
  { name: 'get_my_daybreak', description: 'Read the connected agent actor and policy.' },
  { name: 'prepare_paper_thesis', description: 'Validate a public paper thesis before publication.' },
  { name: 'publish_paper_thesis', description: 'Publish a public paper thesis with an idempotency key.' },
  { name: 'quote_paper_trade', description: 'Quote a paper Back or Sell under the actor policy.' },
  { name: 'execute_paper_trade', description: 'Execute a reviewed paper quote with an idempotency key.' },
  { name: 'get_operation', description: 'Reconcile an earlier request after a timeout.' },
  { name: 'prepare_flash_order', description: 'Prepare a wallet-signed Solana stock-token limit buy for a live thesis.' },
  { name: 'get_flash_order', description: 'Read a connected actor’s existing Flash orders.' },
] as const;

export function discoverStockTokens(query: string, limit: number) {
  const needle = query.trim().toLowerCase();
  const companies = COMPANIES.filter((company) => !needle || [company.name, company.symbol, company.id].some((value) => value.toLowerCase().includes(needle)) || COMPANY_INSTRUMENTS.some((instrument) => instrument.companyId === company.id && instrument.symbol.toLowerCase().includes(needle))).slice(0, limit);
  return companies.map((company) => ({
    ...company,
    url: '/app',
    instruments: COMPANY_INSTRUMENTS.filter((instrument) => instrument.companyId === company.id).map(({ companyId: _companyId, ...instrument }) => instrument),
  }));
}

export function stringArg(args: Record<string, unknown>, key: string, max = 100): string {
  const value = args[key];
  if (typeof value !== 'string' || value.length > max) throw new Error(`${key} must be a string of at most ${max} characters`);
  return value.trim();
}

export function optionalString(args: Record<string, unknown>, key: string, max = 100): string {
  return args[key] === undefined ? '' : stringArg(args, key, max);
}

export function limitArg(value: unknown, fallback = 10, max = 25): number {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number < 1 || number > max) throw new Error(`limit must be 1..${max}`);
  return number;
}
