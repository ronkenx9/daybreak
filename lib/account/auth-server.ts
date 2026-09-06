import 'server-only';
import { PrivyClient } from '@privy-io/server-auth';
import { resolveUser } from '@/lib/db/repo';
import { isDbConfigured } from '@/lib/db/client';

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? process.env.PRIVY_APP_ID ?? '';
const APP_SECRET = process.env.PRIVY_APP_SECRET ?? '';

// Backend is "ready" only when we can both verify tokens and store data.
export const isAccountsBackendReady = APP_ID.length > 0 && APP_SECRET.length > 0 && isDbConfigured;

let client: PrivyClient | null = null;
function privy() {
  if (!client) client = new PrivyClient(APP_ID, APP_SECRET, {});
  return client;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function requireActiveAccount<T extends { status: string }>(user: T): T {
  if (user.status !== 'active') throw new HttpError(403, 'This account is not active');
  return user;
}

// Every private request derives the acting user from a verified Privy token —
// never from a client-supplied id. 503 when unconfigured, 401 when unauthed.
export async function requireUser(req: Request) {
  if (!isAccountsBackendReady) throw new HttpError(503, 'Accounts are not configured on this server');
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Sign in required');
  let claims: { userId?: string };
  try {
    claims = await privy().verifyAuthToken(token);
  } catch {
    throw new HttpError(401, 'Invalid or expired session');
  }
  if (!claims.userId) throw new HttpError(401, 'Invalid session');
  return requireActiveAccount(await resolveUser(claims.userId));
}

export async function readJsonObject(req: Request, maxBytes = 16_384): Promise<Record<string, unknown>> {
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new HttpError(413, 'Request body is too large');
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new HttpError(413, 'Request body is too large');
  try {
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status, headers: e.status === 429 ? { 'Retry-After': '60' } : undefined });
  return Response.json({ error: 'Server error' }, { status: 500 });
}
