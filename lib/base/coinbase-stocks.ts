import 'server-only';

export const COINBASE_STOCKS_API = 'https://api.coinbase.com/v1/tokenized-stocks';

export interface CoinbaseStockRecord {
  contractAddress: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: number;
  navPrice: number | null;
  navPriceUpdatedAt: number | null;
  paused: boolean;
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function parseRecord(value: unknown): CoinbaseStockRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const contractAddress = typeof row.contract_address === 'string' ? row.contract_address : '';
  const symbol = typeof row.symbol === 'string' ? row.symbol : '';
  const name = typeof row.name === 'string' ? row.name : '';
  const decimals = finiteNumber(row.decimals);
  const totalSupply = finiteNumber(row.total_supply);
  if (!/^0x[0-9a-f]{40}$/i.test(contractAddress) || !symbol || !name || decimals == null || !Number.isInteger(decimals) || decimals < 0 || decimals > 18 || totalSupply == null || totalSupply < 0) return null;
  const navPrice = finiteNumber(row.nav_price);
  const updated = typeof row.nav_price_updated_at === 'string' ? Date.parse(row.nav_price_updated_at) : NaN;
  const pausedFeatures = Array.isArray(row.paused_features) ? row.paused_features : [];
  return {
    contractAddress: contractAddress as `0x${string}`,
    symbol,
    name,
    decimals,
    totalSupply,
    navPrice: navPrice != null && navPrice > 0 ? navPrice : null,
    navPriceUpdatedAt: Number.isFinite(updated) && updated > 0 ? updated : null,
    paused: pausedFeatures.length > 0,
  };
}

export async function readCoinbaseStockCatalog(signal?: AbortSignal): Promise<Map<string, CoinbaseStockRecord>> {
  const timeout = signal ? undefined : AbortSignal.timeout(5_000);
  const response = await fetch(COINBASE_STOCKS_API, { signal: signal ?? timeout, headers: { accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Coinbase stock catalog returned ${response.status}`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { tokens?: unknown }).tokens)) throw new Error('Coinbase stock catalog was malformed');
  const records = (payload as { tokens: unknown[] }).tokens.map(parseRecord).filter((row): row is CoinbaseStockRecord => row != null && row.totalSupply > 0);
  return new Map(records.map((row) => [row.contractAddress.toLowerCase(), row]));
}
