// StonkFun public API client (browser-safe, no key — per-IP rate limits).
// Docs: https://www.stonkfun.xyz Developer API. Flow mirrors their launch.mjs:
// prepare (unsigned payment tx) -> sign locally -> submit (atomic bundle) -> poll.
// NEVER pay twice: a `processing` submit means the launch is ON CHAIN.
const API = 'https://www.stonkfun.xyz/api/public/v1';

export class StonkFunError extends Error {
  code: string; status: number;
  constructor(code: string, message: string, status: number) {
    super(message); this.code = code; this.status = status;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(API + path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new StonkFunError(body?.error?.code ?? 'internal', body?.error?.message ?? `StonkFun ${r.status}`, r.status);
  return body.data as T;
}

export interface StonkPair { symbol: string; mint: string; category: string; launchable: boolean; launchLabReady?: boolean }

export async function listPairs(): Promise<StonkPair[]> {
  const data = await call<{ pairs: StonkPair[] }>('/pairs?launchable=true');
  return data.pairs.filter((p) => p.launchable);
}

export interface PrepareInput {
  creatorWallet: string; quoteMint: string; name: string; symbol: string;
  mode: 'standard' | 'reward'; feeTier?: '2%'; devBuyPercent?: number; devBuySol?: number;
  airdropPercent?: number; airdropTier?: string; logo?: string;
}
export interface Prepared { paymentTransaction: string; signedQuote: unknown; devBuy?: unknown; airdrop?: unknown }

export async function prepareLaunch(input: PrepareInput): Promise<Prepared> {
  if (!/^[A-Z0-9]{2,10}$/.test(input.symbol)) throw new Error('Symbol must be 2–10 letters or numbers');
  if (input.name.trim().length < 2 || input.name.length > 100) throw new Error('Name must be 2–100 characters');
  return call<Prepared>('/launches/prepare', { method: 'POST', body: JSON.stringify(input) });
}

export interface SubmitResult { status: 'completed' | 'processing'; mint?: string; paymentSignature?: string }

// A Solana transaction starts with a shortvec signature count followed by 64-byte
// signatures. Derive the payment signature before submit so an accepted request
// can always be reconciled even when its HTTP response is lost.
export function signedTransactionSignature(signedBase64: string): string {
  const raw = Uint8Array.from(atob(signedBase64), (c) => c.charCodeAt(0));
  let count = 0; let shift = 0; let offset = 0;
  for (;;) {
    if (offset >= raw.length || shift > 21) throw new Error('Invalid signed Solana transaction');
    const byte = raw[offset++]; count |= (byte & 0x7f) << shift;
    if (!(byte & 0x80)) break;
    shift += 7;
  }
  if (count < 1 || raw.length < offset + 64) throw new Error('Signed transaction has no signature');
  const signature = raw.slice(offset, offset + 64);
  if (signature.every((byte) => byte === 0)) throw new Error('Wallet returned an unsigned transaction');
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = [0];
  for (const byte of signature) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) { carry += digits[i] << 8; digits[i] = carry % 58; carry = Math.floor(carry / 58); }
    while (carry) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  let result = '';
  for (const byte of signature) { if (byte !== 0) break; result += alphabet[0]; }
  for (let i = digits.length - 1; i >= 0; i--) result += alphabet[digits[i]];
  return result;
}

export async function submitLaunch(args: { signedQuote: unknown; signedTransaction: string; logo?: string }): Promise<SubmitResult> {
  return call<SubmitResult>('/launches/submit', { method: 'POST', body: JSON.stringify(args) });
}

export async function launchStatus(paymentSignature: string): Promise<SubmitResult & { mint?: string }> {
  return call(`/launches/${paymentSignature}`);
}

export async function pollLaunch(paymentSignature: string, onTick?: () => void, deadlineMs = 10 * 60_000): Promise<string> {
  const started = Date.now();
  for (;;) {
    if (Date.now() - started > deadlineMs) throw new StonkFunError('timeout-unknown', 'Still no confirmation — the launch may be on chain. Check status before retrying.', 504);
    const s = await launchStatus(paymentSignature);
    if (s.status === 'completed' && s.mint) return s.mint;
    if (s.status !== 'processing') throw new Error('Launch did not complete');
    onTick?.();
    await new Promise((r) => setTimeout(r, 5000));
  }
}

export interface Claimable { claimable: null | { quote: { amountTokens: string; symbol: string } } }

export async function feeStatus(mint: string): Promise<Claimable> {
  return call(`/tokens/${mint}/fees`);
}

export async function prepareClaim(mint: string, creatorWallet: string): Promise<{ transaction: string; intentId: string }> {
  return call(`/tokens/${mint}/fees/claim/prepare`, { method: 'POST', body: JSON.stringify({ creatorWallet }) });
}

export async function submitClaim(mint: string, args: { creatorWallet: string; intentId: string; signedTransaction: string }): Promise<{ signature: string }> {
  return call(`/tokens/${mint}/fees/claim/submit`, { method: 'POST', body: JSON.stringify(args) });
}
