import { errorResponse, HttpError, requireUser } from '@/lib/account/auth-server';
import { circleNewsAccess } from '@/lib/db/repo';
import { fetchCompanyNews, type FeedItem } from '@/lib/news/provider';
import { fetchPreStockNews } from '@/lib/news/prestocks-news';
import { companyNewsTargets, type CompanyNewsTarget } from '@/lib/news/company-routing';
import { createRequestCache } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';

interface CircleFeed {
  items: FeedItem[];
  checkedAt: number;
  stale: boolean;
}

const cached = createRequestCache<CircleFeed>(5 * 60_000, 64, 3);

async function fetchCompanyLane(company: CompanyNewsTarget) {
  if (company.newsProvider === 'finnhub') return fetchCompanyNews(company.symbol);
  if (company.newsProvider === 'prestocks') {
    const feed = await fetchPreStockNews(company.symbol);
    return {
      ticker: company.symbol,
      articles: feed.items,
      checkedAt: Math.max(0, ...feed.items.map((item) => Date.parse(item.seenAt) || 0)),
      stale: feed.stale,
    };
  }
  return { ticker: company.symbol, articles: [], checkedAt: 0, stale: false };
}

function balancedStories(lanes: Array<{ ticker: string; articles: Omit<FeedItem, 'ticker'>[]; checkedAt: number; stale: boolean }>, limit = 6): CircleFeed {
  const items: FeedItem[] = [];
  for (let round = 0; items.length < limit; round++) {
    let added = false;
    for (const lane of lanes) {
      const article = lane.articles[round];
      if (!article) continue;
      items.push({ ticker: lane.ticker, ...article });
      added = true;
      if (items.length === limit) break;
    }
    if (!added) break;
  }
  return {
    items,
    checkedAt: Math.max(0, ...lanes.map((lane) => lane.checkedAt)),
    stale: lanes.some((lane) => lane.stale),
  };
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const slug = new URL(req.url).searchParams.get('slug') ?? '';
    const access = await circleNewsAccess(user.id, slug);
    if (!access.ok) throw new HttpError(access.reason === 'missing' ? 404 : 403, access.reason === 'missing' ? 'Circle not found' : 'Verify the required holding to read this feed');
    if (!access.tickers.length) return Response.json({ items: [], checkedAt: 0, stale: false }, { headers: { 'Cache-Control': 'private, no-store' } });
    const companies = companyNewsTargets(access.tickers);
    const key = companies.map((company) => company.companyId).sort().join(',');
    const feed = await cached(key, async () => {
      const results = await Promise.allSettled(companies.map((company) => fetchCompanyLane(company)));
      const lanes = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
      if (!lanes.length) throw new Error('Circle news unavailable');
      return balancedStories(lanes);
    });
    return Response.json(feed, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
