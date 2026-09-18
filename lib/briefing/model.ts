export type BriefingState = 'empty_holdings' | 'ready' | 'partial' | 'no_developments' | 'unavailable';
export type BriefingKind = 'corporate_action' | 'news';

export interface BriefingItem {
  eventId: string;
  revision: number;
  companyId: string;
  companyName: string;
  symbol: string;
  companyType: 'public' | 'private';
  kind: BriefingKind;
  title: string;
  summary: string;
  relevance: string;
  sourceName: string;
  sourceUrl: string;
  occurredAt: string;
  freshness: 'fresh' | 'latest_available';
  actionHref: string;
  actionLabel: string;
}

const time = (value: string) => Date.parse(value) || 0;
const headlineKey = (item: BriefingItem) => `${item.companyId}:${item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`;

/** Deterministic ranking works without an LLM and keeps revised events singular. */
export function rankBriefingItems(input: BriefingItem[], limit = 12, now = Date.now()): BriefingItem[] {
  const byEvent = new Map<string, BriefingItem>();
  for (const item of input) {
    const key = item.kind === 'corporate_action' ? `${item.companyId}:${item.eventId}` : `${headlineKey(item)}:${item.sourceUrl}`;
    const previous = byEvent.get(key);
    if (!previous || item.revision > previous.revision || time(item.occurredAt) > time(previous.occurredAt)) byEvent.set(key, item);
  }
  const seenHeadlines = new Set<string>();
  const unique = [...byEvent.values()].filter((item) => {
    if (item.kind !== 'news') return true;
    const key = headlineKey(item);
    if (seenHeadlines.has(key)) return false;
    seenHeadlines.add(key);
    return true;
  });
  unique.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'corporate_action' ? -1 : 1;
    if (a.kind === 'corporate_action') {
      const aFuture = time(a.occurredAt) >= now ? 0 : 1;
      const bFuture = time(b.occurredAt) >= now ? 0 : 1;
      return aFuture - bFuture || time(a.occurredAt) - time(b.occurredAt);
    }
    return Number(a.freshness === 'latest_available') - Number(b.freshness === 'latest_available') || time(b.occurredAt) - time(a.occurredAt);
  });
  return unique.slice(0, Math.max(0, Math.min(24, limit)));
}

export interface BriefingResponse {
  state: BriefingState;
  items: BriefingItem[];
  coverage: { companies: number; covered: number; unavailable: number; latestAvailable: number };
  generatedAt: string;
}
