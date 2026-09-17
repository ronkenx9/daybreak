import 'server-only';
import { prestockBySymbol } from '@/lib/solana/prestocks-registry';
import { canonicalArticleUrl } from './url';
import { saveSnapshot, loadSnapshot } from './cache';

// Pre-IPO company news. PreStocks names are PRIVATE companies (Anthropic, OpenAI,
// SpaceX, Anduril, ...), so Finnhub company-news — which is keyed by public ticker —
// cannot cover them. We use GDELT Doc 2.0, a free keyword news index (no key), one
// query per company. GDELT asks for <=1 request / 5s, so results are cached per
// symbol in feed_snapshots and fetched lazily when a company detail is opened.
const GDELT = 'https://api.gdeltproject.org/api/v2/doc/doc';
const UA = 'Mozilla/5.0 (compatible; DaybreakBot/1.0; +https://www.daybreakcircles.lol)';
const TTL_MS = 15 * 60_000; // serve cached news for 15 min before refetching

export interface PreStockArticle { title: string; url: string; source: string; seenAt: string; image: string }

// GDELT seendate is compact UTC: YYYYMMDDTHHMMSSZ -> ISO.
function parseSeenDate(v: unknown): string {
  if (typeof v !== 'string') return '';
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(v);
  if (!m) return '';
  const [, y, mo, d, h, mi, s] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  return Number.isNaN(Date.parse(iso)) ? '' : iso;
}

function mapArticles(raw: unknown, limit: number): PreStockArticle[] {
  const arts = (raw as { articles?: unknown })?.articles;
  if (!Array.isArray(arts)) return [];
  const seen = new Set<string>(); const out: PreStockArticle[] = [];
  for (const a of arts as Record<string, unknown>[]) {
    const title = typeof a?.title === 'string' ? a.title.trim().slice(0, 200) : '';
    const url = canonicalArticleUrl(a?.url);
    if (!title || !url || seen.has(url)) continue;
    seen.add(url);
    const source = typeof a?.domain === 'string' && a.domain ? a.domain.slice(0, 120) : '';
    const image = typeof a?.socialimage === 'string' && /^https?:\/\//i.test(a.socialimage) ? a.socialimage.slice(0, 2000) : '';
    out.push({ title, url, source, seenAt: parseSeenDate(a?.seendate), image });
    if (out.length >= limit) break;
  }
  return out;
}

// Fetch (cached) recent news for one PreStocks company symbol. Returns [] rather
// than throwing so the news lane degrades quietly.
export async function fetchPreStockNews(symbol: string, limit = 8): Promise<{ items: PreStockArticle[]; stale: boolean }> {
  const reg = prestockBySymbol(symbol);
  if (!reg) return { items: [], stale: false };
  const key = `prestocks-news:${reg.symbol}`;
  const cached = await loadSnapshot<PreStockArticle[]>(key, TTL_MS);
  if (cached && cached.length) return { items: cached.slice(0, limit), stale: false };
  try {
    const qs = new URLSearchParams({ query: reg.newsQuery, mode: 'artlist', maxrecords: '20', format: 'json', sort: 'datedesc', timespan: '14d' });
    const r = await fetch(`${GDELT}?${qs}`, { headers: { accept: 'application/json', 'user-agent': UA }, signal: AbortSignal.timeout(6000), cache: 'no-store' });
    const ct = r.headers.get('content-type') || '';
    // GDELT throttles with a slow HTTP 429 and a plain-text body; treat any
    // non-JSON / non-2xx as a soft miss and serve last-good.
    if (!r.ok || !ct.includes('json')) throw new Error('bad response');
    const items = mapArticles(await r.json(), 20);
    if (!items.length) throw new Error('empty');
    await saveSnapshot(key, items);
    return { items: items.slice(0, limit), stale: false };
  } catch {
    const stale = await loadSnapshot<PreStockArticle[]>(key, null);
    return { items: (stale ?? []).slice(0, limit), stale: true };
  }
}
