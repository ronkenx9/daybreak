import { COMPANIES, COMPANY_INSTRUMENTS } from '@/lib/assets/companies';
import { XLAYER_NAMESPACE, XLAYER_STOCKS, XLAYER_STOCK_DECIMALS, xlayerExplorerUrl } from '@/lib/xlayer/tokens';

export const OKX_PUBLIC_TOOLS = [
  { name: 'discover_stock_tokens', description: 'Find canonical Daybreak company and stock-token identities.', arguments: 'query?: company name, ticker or token symbol; limit?: 1..25' },
  { name: 'get_stock_market_data', description: 'Read timestamped USD equity reference prices; these are not executable token quotes.', arguments: 'symbol: public equity ticker, e.g. NVDA' },
  { name: 'get_company_context', description: 'Read sourced headlines and public Circle metadata for a company.', arguments: 'symbol: company ticker; limit?: 1..10 headlines' },
  { name: 'find_theses', description: 'Search public Daybreak conviction markets across paper and live modes.', arguments: 'query?: search text; mode?: paper|live; actor?: human|agent; limit?: 1..25; cursor?: nextCursor from prior response' },
  { name: 'get_thesis', description: 'Read one public conviction thesis.', arguments: 'id: public thesis UUID or slug' },
  { name: 'list_xlayer_stock_tokens', description: 'List verified xStocks tokenized stocks on X Layer with contract addresses and a live on-chain supply snapshot.', arguments: 'query?: ticker or xStocks symbol, e.g. TSLA or TSLAx; limit?: 1..25' },
  { name: 'get_xlayer_stock_holdings', description: 'Read a wallet’s xStocks holdings on X Layer, including ERC-4626 wrapped balances, converted to underlying shares.', arguments: 'address: 0x EVM wallet address' },
  { name: 'get_thesis_activity', description: 'Read bounded public paper market activity.', arguments: 'id: public paper thesis UUID or slug; tradesCursor?, positionsCursor?, balancesCursor?: pagination cursors' },
] as const;

export const OKX_CONNECTED_TOOLS = [
  { name: 'get_my_daybreak', description: 'Read the connected agent actor and policy.', arguments: 'none' },
  { name: 'prepare_paper_thesis', description: 'Validate a public paper thesis before publication.', arguments: 'instrumentId, title, summary, body, invalidation, tokenName, tokenSymbol required; horizon?, sources? optional' },
  { name: 'publish_paper_thesis', description: 'Publish a public paper thesis with an idempotency key.', arguments: 'same fields as prepare_paper_thesis; Idempotency-Key HTTP header required' },
  { name: 'quote_paper_trade', description: 'Quote a paper Back or Sell under the actor policy.', arguments: 'thesisId: UUID; direction: buy|sell; amount: decimal string; maxSlippageBps?: integer 10..1000' },
  { name: 'execute_paper_trade', description: 'Execute a reviewed paper quote with an idempotency key.', arguments: 'quoteId: UUID; rationale?: short text; Idempotency-Key HTTP header required' },
  { name: 'get_operation', description: 'Reconcile an earlier request after a timeout.', arguments: 'idempotencyKey: exact key from earlier mutation' },
  { name: 'prepare_flash_order', description: 'Prepare a wallet-signed Solana stock-token limit buy for a live thesis.', arguments: 'thesisId: live thesis UUID; amount: USDC decimal string; limitPrice: USDC decimal string' },
  { name: 'get_flash_order', description: 'Read a connected actor’s existing Flash orders.', arguments: 'none' },
] as const;

export function discoverStockTokens(query: string, limit: number) {
  const needle = query.trim().toLowerCase();
  const companies = COMPANIES.filter((company) => !needle || [company.name, company.symbol, company.id].some((value) => value.toLowerCase().includes(needle)) || COMPANY_INSTRUMENTS.some((instrument) => instrument.companyId === company.id && instrument.symbol.toLowerCase().includes(needle))).slice(0, limit);
  return companies.map((company) => ({
    ...company,
    url: 'https://www.daybreakcircles.lol/app',
    instruments: [
      ...COMPANY_INSTRUMENTS.filter((instrument) => instrument.companyId === company.id).map(({ companyId: _companyId, ...instrument }) => instrument),
      ...XLAYER_STOCKS.filter((stock) => stock.companyId === company.id).map((stock) => ({
        namespace: XLAYER_NAMESPACE, identity: stock.token, symbol: stock.symbol, decimals: XLAYER_STOCK_DECIMALS,
        issuer: 'xstocks' as const, isin: stock.isin, wrapper: stock.wrapper, externalUrl: xlayerExplorerUrl(stock.token),
      })),
    ],
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
