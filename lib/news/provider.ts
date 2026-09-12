import 'server-only';
import { saveSnapshot, loadSnapshot } from './cache';

// Finnhub company-news is keyed by real ticker symbol and returns headline, url,
// source, image and timestamp already scoped to the company, so there's no need
// for GDELT-style OR queries or title matching. Free tier is 60 calls/min.
//
// COMPANY_QUERIES stays exported as the supported-symbol allowlist (the values
// are unused now but kept so /api/news's `Object.hasOwn` guard keeps working).
export const COMPANY_QUERIES: Record<string, string> = {
  AAPL: 'Apple', AMZN: 'Amazon', GOOGL: 'Alphabet', NVDA: 'Nvidia', TSLA: 'Tesla',
  META: 'Meta', MSFT: 'Microsoft', COIN: 'Coinbase', CRCL: 'Circle', INTC: 'Intel',
  MSTR: 'MicroStrategy', SNDK: 'Sandisk', SPCX: 'SpaceX', SONY: 'Sony', NFLX: 'Netflix', SBUX: 'Starbucks',
};

// Ticker → Finnhub symbol. Identity for listed names; SpaceX is private so it has
// no company-news feed and is simply skipped.
const FINNHUB_SYMBOL: Record<string, string> = {
  AAPL: 'AAPL', AMZN: 'AMZN', GOOGL: 'GOOGL', NVDA: 'NVDA', TSLA: 'TSLA', META: 'META',
  MSFT: 'MSFT', COIN: 'COIN', CRCL: 'CRCL', INTC: 'INTC', MSTR: 'MSTR', SNDK: 'SNDK',
};

export interface Article { title: string; url: string; source: string; seenAt: string; image: string }
export interface FeedItem extends Article { ticker: string }

const FINNHUB_BASE = 'https://finnhub.io/api/v1/company-news';

function apiKey(): string {
  const key = process.env.FINNHUB_API_KEY?.trim();
  if (!key) throw new Error('FINNHUB_API_KEY is not set');
  return key;
}

const day = (offsetDays: number) => new Date(Date.now() - offsetDays * 86400_000).toISOString().slice(0, 10);

interface FinnhubItem { headline?: unknown; url?: unknown; source?: unknown; datetime?: unknown; image?: unknown }

// Headline relevance: Finnhub assigns by company, loosely (a Monster Beverage
// headline has shipped as NVDA). Drop headlines naming nothing we track so a
// story is never presented as a company event it isn't.
const RELEVANCE_TERMS: Record<string, string[]> = {
  AAPL: ['apple', 'iphone', 'ipad', 'mac', 'cook', 'vision pro', 'app store'],
  AMZN: ['amazon', 'bezos', 'aws', 'prime', 'whole foods', 'twitch', 'alexa'],
  GOOGL: ['google', 'alphabet', 'gemini', 'youtube', 'android', 'pichai', 'waymo', 'deepmind'],
  NVDA: ['nvidia', 'nvda', 'jensen', 'blackwell', 'hopper', 'cuda', 'geforce'],
  TSLA: ['tesla', 'tsla', 'musk', 'cybertruck', 'model y', 'model 3', 'optimus', 'robotaxi'],
  META: ['meta', 'facebook', 'instagram', 'whatsapp', 'zuckerberg', 'quest', 'threads'],
  MSFT: ['microsoft', 'msft', 'nadella', 'azure', 'openai', 'copilot', 'xbox', 'linkedin'],
  COIN: ['coinbase', 'armstrong', 'base'],
  CRCL: ['circle', 'crcl', 'usdc', 'allaire'],
  INTC: ['intel', 'intc'],
  MSTR: ['microstrategy', 'mstr', 'saylor', 'bitcoin'],
  SNDK: ['sandisk', 'sndk', 'western digital', 'nand', 'flash memory'],
};

function mapItems(ticker: string, raw: unknown, limit: number): FeedItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>(); const out: FeedItem[] = [];
  for (const a of raw as FinnhubItem[]) {
    if (!a || typeof a.headline !== 'string' || typeof a.url !== 'string') continue;
    let u: URL; try { u = new URL(a.url); } catch { continue; }
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) continue;
    u.hash = ''; for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k);
    const key = u.toString(); if (seen.has(key)) continue; seen.add(key);
    const seenAt = typeof a.datetime === 'number' && a.datetime > 0 ? new Date(a.datetime * 1000).toISOString() : '';
    const image = typeof a.image === 'string' && /^https?:\/\//i.test(a.image) ? a.image.slice(0, 2000) : '';
    const source = typeof a.source === 'string' && a.source ? a.source.slice(0, 120) : u.hostname.replace(/^www\./, '');
    const title = a.headline.slice(0, 200);
    const terms = RELEVANCE_TERMS[ticker] ?? [];
    if (terms.length && !terms.some((t) => title.toLowerCase().includes(t))) continue;
    out.push({ ticker, title, url: key, source, seenAt, image });
    if (out.length === limit) break;
  }
  // Newest first — Finnhub returns roughly reverse-chronological but don't assume.
  return out.sort((x, y) => (Date.parse(y.seenAt) || 0) - (Date.parse(x.seenAt) || 0));
}

async function fetchSymbolNews(ticker: string, limit: number): Promise<FeedItem[]> {
  const symbol = FINNHUB_SYMBOL[ticker];
  if (!symbol) return [];
  const url = new URL(FINNHUB_BASE);
  url.search = new URLSearchParams({ symbol, from: day(14), to: day(0), token: apiKey() }).toString();
  const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(9000), cache: 'no-store' });
  if (!r.ok) throw new Error(`Finnhub ${r.status}`);
  return mapItems(ticker, await r.json().catch(() => null), limit);
}

// ---- Per-company feed (stock workspace) ----
export async function fetchCompanyNews(ticker: string) {
  if (!Object.hasOwn(COMPANY_QUERIES, ticker)) throw new Error('Unsupported company');
  let fresh: Article[] = [];
  try {
    fresh = (await fetchSymbolNews(ticker, 8)).map(({ ticker: _t, ...rest }) => rest);
  } catch { fresh = []; }
  if (fresh.length) {
    await saveSnapshot(`company:${ticker}`, fresh);
    return { ticker, articles: fresh, checkedAt: Date.now(), provider: 'Finnhub', stale: false };
  }
  const recycled = await loadSnapshot<Article[]>(`company:${ticker}`, 72 * 3600_000);
  if (recycled?.length) return { ticker, articles: recycled, checkedAt: Date.now(), provider: 'Finnhub', stale: true };
  throw new Error('News provider unavailable');
}

// ---- Cross-stock ticker feed (always-on marquee) ----
// The store keeps the last good set per ticker. Each poll refreshes a rotating
// batch, and everything still fresh is merged, so a headline that fails to
// refresh keeps showing until it ages out — the marquee never empties on a miss.
const FEED_ORDER = ['NVDA', 'TSLA', 'COIN', 'MSTR', 'CRCL', 'META', 'GOOGL', 'MSFT', 'AAPL', 'AMZN', 'INTC', 'SNDK'];
const FEED_TTL = 12 * 3600_000; // keep last-good headlines up to 12h
const feedStore = new Map<string, { items: FeedItem[]; at: number }>();
let feedCursor = 0;

export async function fetchNewsFeed(): Promise<{ items: FeedItem[]; checkedAt: number; provider: string; stale?: boolean }> {
  const batch: string[] = [];
  for (let i = 0; i < 6; i++) batch.push(FEED_ORDER[(feedCursor + i) % FEED_ORDER.length]);
  feedCursor = (feedCursor + 6) % FEED_ORDER.length;

  const results = await Promise.allSettled(batch.map((t) => fetchSymbolNews(t, 3)));
  const freshTickers = new Set<string>();
  results.forEach((res, i) => {
    if (res.status === 'fulfilled' && res.value.length) {
      feedStore.set(batch[i], { items: res.value, at: Date.now() });
      freshTickers.add(batch[i]);
    }
  });

  const now = Date.now(); const merged: FeedItem[] = [];
  for (const [, v] of feedStore) if (now - v.at < FEED_TTL) merged.push(...v.items);
  // Cold instances and partial polls backfill from the persisted snapshot for
  // tickers this round did not refresh — every covered ticker stays warm even
  // though each poll only refreshes six.
  if (freshTickers.size < FEED_ORDER.length) {
    const snap = await loadSnapshot<FeedItem[]>('ticker-feed', 72 * 3600_000);
    if (snap?.length) {
      const seen = new Set(merged.map((m) => m.url));
      for (const item of snap) {
        if (!freshTickers.has(item.ticker) && !seen.has(item.url)) { merged.push(item); seen.add(item.url); }
      }
    }
  }
  merged.sort((a, b) => (Date.parse(b.seenAt) || 0) - (Date.parse(a.seenAt) || 0));

  // Fresh items win and refresh the persisted snapshot. On a total miss serve
  // the snapshot so the marquee, circle strips and meme chips never starve.
  // stale:true whenever this response leans on anything unfresh.
  if (merged.length) {
    const items = merged.slice(0, 20);
    if (freshTickers.size) await saveSnapshot('ticker-feed', items);
    return { items, checkedAt: now, provider: 'Finnhub', stale: !freshTickers.size };
  }
  const recycled = await loadSnapshot<FeedItem[]>('ticker-feed', 72 * 3600_000);
  if (recycled?.length) return { items: recycled.slice(0, 20), checkedAt: now, provider: 'Finnhub', stale: true };
  throw new Error('News provider unavailable');
}
