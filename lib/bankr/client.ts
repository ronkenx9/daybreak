import 'server-only';
import { BANKR_API_BASE, BANKR_AUTH_MODE, BANKR_USER_KEY, BANKR_PARTNER_KEY, isBankrConfigured, BANKR_CHAIN } from './config';
import type { SwapQuoteRequest, SwapQuote, SwapExecuteRequest, SwapResult, DeployRequest, DeployResult } from './types';

export type BankrErrorCode =
  | 'not_configured' | 'bad_request' | 'unauthorized' | 'forbidden'
  | 'duplicate' | 'unavailable' | 'timeout' | 'unknown';

export class BankrHttpError extends Error {
  code: BankrErrorCode; status: number;
  constructor(status: number, code: BankrErrorCode, message: string) { super(message); this.status = status; this.code = code; }
}

function codeForStatus(status: number): BankrErrorCode {
  if (status === 400) return 'bad_request';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 409) return 'duplicate';
  if (status === 502 || status === 503 || status === 504) return 'unavailable';
  return 'unknown';
}

function authHeaders(): Record<string, string> {
  if (BANKR_AUTH_MODE === 'partner') return { 'X-Partner-Key': BANKR_PARTNER_KEY };
  if (BANKR_AUTH_MODE === 'user') return { 'X-API-Key': BANKR_USER_KEY };
  return {};
}

const TIMEOUT_MS = 15_000;

// Core request. Fails closed when unconfigured. Never logs or surfaces the key.
export async function bankrFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!isBankrConfigured) throw new BankrHttpError(503, 'not_configured', 'Bankr is not configured on this server');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BANKR_API_BASE}${path}`, {
      method: init.method ?? 'GET',
      headers: { 'content-type': 'application/json', accept: 'application/json', ...authHeaders() },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof (data as { message?: unknown }).message === 'string' ? (data as { message: string }).message : `Bankr request failed (${res.status})`;
      throw new BankrHttpError(res.status, codeForStatus(res.status), msg);
    }
    return data as T;
  } catch (e) {
    if (e instanceof BankrHttpError) throw e;
    if ((e as Error)?.name === 'AbortError') throw new BankrHttpError(504, 'timeout', 'Bankr request timed out');
    throw new BankrHttpError(500, 'unknown', 'Bankr request error');
  } finally {
    clearTimeout(timer);
  }
}

// Typed wrappers. Base is always forced, and every request fails closed until
// a Bankr key is configured.
export const swapQuote = (req: Omit<SwapQuoteRequest, 'fromChain' | 'toChain'>) =>
  bankrFetch<SwapQuote>('/wallet/swap-quote', { method: 'POST', body: { ...req, fromChain: BANKR_CHAIN, toChain: BANKR_CHAIN } });

export const swapExecute = (req: Omit<SwapExecuteRequest, 'fromChain' | 'toChain'>) =>
  bankrFetch<SwapResult>('/wallet/swap', { method: 'POST', body: { ...req, fromChain: BANKR_CHAIN, toChain: BANKR_CHAIN } });

export function deployToken(req: Omit<DeployRequest, 'chain'>) {
  if (req.pairedTokenAddress && req.pairedStockAddress) {
    throw new BankrHttpError(400, 'bad_request', 'pairedTokenAddress and pairedStockAddress are mutually exclusive');
  }
  return bankrFetch<DeployResult>('/token-launches/deploy', { method: 'POST', body: { ...req, chain: BANKR_CHAIN } });
}
