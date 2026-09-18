import { createHash } from 'node:crypto';

const TICKER = /^[A-Z0-9]{1,16}$/;
const SCOPE = /^[a-z0-9-]{3,64}$/;

export function canonicalArticleUrl(input: unknown) {
  if (typeof input !== 'string' || input.length > 2_000) return null;
  try {
    const url = new URL(input);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0' || host === '127.0.0.1' || host === '::1') return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_')) url.searchParams.delete(key);
    return url.toString();
  } catch { return null; }
}

export function articleIdentity(tickerInput: unknown, urlInput: unknown, scopeInput?: unknown) {
  const ticker = typeof tickerInput === 'string' ? tickerInput.toUpperCase() : '';
  const url = canonicalArticleUrl(urlInput);
  const scope = typeof scopeInput === 'string' && scopeInput ? scopeInput.toLowerCase() : '';
  if (!TICKER.test(ticker) || !url || (scope && !SCOPE.test(scope))) return null;
  const identity = scope ? `${scope}\n${ticker}\n${url}` : `${ticker}\n${url}`;
  return { ticker, url, key: createHash('sha256').update(identity).digest('hex') };
}
