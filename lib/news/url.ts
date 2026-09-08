import { createHash } from 'node:crypto';

const TICKER = /^[A-Z]{1,8}$/;

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

export function articleIdentity(tickerInput: unknown, urlInput: unknown) {
  const ticker = typeof tickerInput === 'string' ? tickerInput.toUpperCase() : '';
  const url = canonicalArticleUrl(urlInput);
  if (!TICKER.test(ticker) || !url) return null;
  return { ticker, url, key: createHash('sha256').update(`${ticker}\n${url}`).digest('hex') };
}
