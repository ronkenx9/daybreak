'use client';
import { getAccessToken } from '@privy-io/react-auth';

// Attaches the current Privy access token to each request. The server verifies
// it and derives the user — the client never sends its own user id.
export async function authedFetch<T = unknown>(url: string, opts: RequestInit = {}): Promise<T> {
  const token = await getAccessToken().catch(() => null);
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(opts.headers as Record<string, string> | undefined) };
  if (token) headers.authorization = `Bearer ${token}`;
  const r = await fetch(url, { ...opts, headers, cache: 'no-store' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error((data as { error?: string }).error || 'Request failed') as Error & { status?: number };
    err.status = r.status;
    throw err;
  }
  return data as T;
}
