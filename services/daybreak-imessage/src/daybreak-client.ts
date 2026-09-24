import type {
  CompanyContext,
  MarketData,
  StockDiscovery,
  ThesisSearch,
  ToolEnvelope,
} from './types.js';

type FetchLike = typeof fetch;
type ToolName = 'discover_stock_tokens' | 'get_stock_market_data' | 'get_company_context' | 'find_theses';

export class DaybreakApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'DaybreakApiError';
  }
}

export class DaybreakClient {
  private readonly endpoint: string;

  constructor(
    apiBase: string,
    private readonly timeoutMs = 8_000,
    private readonly fetcher: FetchLike = fetch,
  ) {
    this.endpoint = new URL('/api/okx/tools', apiBase).toString();
  }

  private async call<T>(tool: ToolName, arguments_: Record<string, unknown>): Promise<ToolEnvelope<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ tool, arguments: arguments_ }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        const message = body && typeof body === 'object' && 'error' in body
          ? String((body as { error?: { message?: unknown } }).error?.message ?? 'Daybreak request failed')
          : 'Daybreak request failed';
        throw new DaybreakApiError(message, response.status);
      }
      if (!body || typeof body !== 'object' || !('data' in body)) {
        throw new DaybreakApiError('Daybreak returned an invalid response');
      }
      return body as ToolEnvelope<T>;
    } catch (error) {
      if (error instanceof DaybreakApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new DaybreakApiError('Daybreak took too long to respond');
      }
      throw new DaybreakApiError('Daybreak is temporarily unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  discover(query = '', limit = 8) {
    return this.call<{ items: StockDiscovery[] }>('discover_stock_tokens', { query, limit });
  }

  market(symbol: string) {
    return this.call<MarketData>('get_stock_market_data', { symbol: symbol.toUpperCase() });
  }

  context(symbol: string, limit = 3) {
    return this.call<CompanyContext>('get_company_context', { symbol: symbol.toUpperCase(), limit });
  }

  theses(query = '', mode?: 'paper' | 'live', limit = 5) {
    return this.call<ThesisSearch>('find_theses', { query, ...(mode ? { mode } : {}), limit });
  }
}
