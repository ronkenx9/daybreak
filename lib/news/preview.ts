import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { canonicalArticleUrl } from './url';

const decode = (value: string) => value
  .replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'")
  .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/\s+/g, ' ').trim();

function privateAddress(address: string) {
  if (address === '::1' || address.startsWith('fe80:') || address.startsWith('fc') || address.startsWith('fd')) return true;
  const parts = address.split('.').map(Number);
  return parts.length === 4 && (parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168));
}

async function assertPublic(url: URL) {
  if (isIP(url.hostname)) { if (privateAddress(url.hostname)) throw Error('Private address'); return; }
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((item) => privateAddress(item.address))) throw Error('Private address');
}

function attrs(tag: string) {
  const found: Record<string, string> = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)) found[match[1].toLowerCase()] = match[2];
  return found;
}

function previewFromHtml(html: string, base: URL) {
  let summary = '', image = '';
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const a = attrs(tag); const key = (a.property || a.name || '').toLowerCase(); const value = decode(a.content || '');
    if (!summary && ['og:description', 'twitter:description', 'description'].includes(key)) summary = value;
    if (!image && ['og:image', 'twitter:image', 'twitter:image:src'].includes(key)) image = value;
  }
  if (!summary) {
    for (const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
      const value = decode(match[1].replace(/<[^>]+>/g, ' '));
      if (value.length >= 80) { summary = value; break; }
    }
  }
  let safeImage = '';
  if (image) try { safeImage = canonicalArticleUrl(new URL(image, base).toString()) ?? ''; } catch {}
  return { summary: summary.slice(0, 520), image: safeImage };
}

export async function fetchArticlePreview(input: string) {
  let current = new URL(input);
  for (let redirects = 0; redirects < 3; redirects++) {
    await assertPublic(current);
    const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(8_000), headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': 'DaybreakPreview/1.0' } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location'); if (!location) throw Error('Invalid redirect');
      const next = canonicalArticleUrl(new URL(location, current).toString()); if (!next) throw Error('Invalid redirect'); current = new URL(next); continue;
    }
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('text/html')) throw Error('Preview unavailable');
    const html = (await response.text()).slice(0, 350_000);
    return previewFromHtml(html, current);
  }
  throw Error('Too many redirects');
}
