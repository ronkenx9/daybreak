import 'server-only';
import { COMPANY_BY_ID } from '@/lib/assets/companies';
import { companyNewsTargets, type CompanyNewsTarget } from '@/lib/news/company-routing';
import { fetchCompanyNews } from '@/lib/news/provider';
import { fetchPreStockNews } from '@/lib/news/prestocks-news';
import { fetchCorporateActions } from '@/lib/providers/xstocks';
import { xstockByTicker } from '@/lib/solana/xstocks-registry';
import { rankBriefingItems, type BriefingItem, type BriefingResponse, type VerifiedHoldingRef } from './model';

const ACTION_SOURCE = 'https://docs.xstocks.fi/apis/openapi/corporate-actions';

function circleSlug(symbol: string, companyId: string) {
  return companyId === 'spacex' ? 'holders-spcx' : `holders-${symbol.toLowerCase()}`;
}

function contextHref(company: CompanyNewsTarget, article?: { url: string; title: string; source: string; seenAt: string }) {
  const params = new URLSearchParams();
  if (company.newsProvider === 'finnhub') params.set('stock', company.symbol);
  else params.set('circle', circleSlug(company.symbol, company.companyId));
  if (article) {
    params.set('story', article.url);
    params.set('headline', article.title);
    params.set('source', article.source);
    if (article.seenAt) params.set('seen', article.seenAt);
  }
  return `${company.newsProvider === 'finnhub' ? '/app' : '/app/groups'}?${params}`;
}

function actionTitle(type: string) {
  const readable = type.replace(/[_-]+/g, ' ').trim();
  return readable && readable.toLowerCase() !== 'unknown' ? readable : 'Corporate action';
}

async function companyItems(target: CompanyNewsTarget, holdings: VerifiedHoldingRef[]): Promise<{ items: BriefingItem[]; newsCovered: boolean; latestAvailable: boolean }> {
  const company = COMPANY_BY_ID[target.companyId];
  if (!company) return { items: [], newsCovered: false, latestAvailable: false };
  const items: BriefingItem[] = [];
  let newsCovered = false;
  let latestAvailable = false;
  const newsResult = await (target.newsProvider === 'finnhub'
    ? fetchCompanyNews(target.symbol).then((feed) => ({ articles: feed.articles, stale: feed.stale }))
    : fetchPreStockNews(target.symbol).then((feed) => ({ articles: feed.items, stale: feed.stale })))
    .catch(() => null);
  if (newsResult) {
    newsCovered = newsResult.articles.length > 0 || !newsResult.stale;
    latestAvailable = newsResult.stale && newsResult.articles.length > 0;
    for (const article of newsResult.articles.slice(0, 4)) {
      items.push({
        eventId: `news:${target.companyId}:${article.url}`, revision: 1,
        companyId: company.id, companyName: company.name, symbol: company.symbol,
        companyType: company.classification, kind: 'news', title: article.title,
        summary: `${article.source || 'A news source'} reported this development about ${company.name}.`,
        relevance: `Included because you have a current verified ${company.name} holding.`,
        sourceName: article.source || 'Original source', sourceUrl: article.url,
        occurredAt: article.seenAt || new Date(0).toISOString(),
        freshness: newsResult.stale ? 'latest_available' : 'fresh',
        actionHref: contextHref(target, article),
        actionLabel: target.newsProvider === 'finnhub' ? 'Open company' : 'Open Circle',
      });
    }
  }
  const xstock = company.classification === 'public' ? xstockByTicker(company.symbol) : undefined;
  const verifiedXStock = xstock && holdings.some((holding) =>
    holding.ticker === company.symbol
    && holding.chainNamespace === 'solana:mainnet'
    && holding.tokenAddress === xstock.mint
  );
  if (verifiedXStock && xstock) {
    const actions = await fetchCorporateActions(company.symbol).catch(() => null);
    const now = Date.now();
    for (const event of actions?.upcoming ?? []) {
      const effective = Date.parse(event.effectiveTimeUtc);
      if (!event.eventId || !Number.isFinite(effective) || effective < now) continue;
      const type = actionTitle(event.caType);
      items.push({
        eventId: `action:${company.id}:${event.eventId}`, revision: event.version,
        companyId: company.id, companyName: company.name, symbol: company.symbol,
        companyType: company.classification, kind: 'corporate_action', title: `${company.name}: ${type}`,
        summary: `xStocks lists an issuer-related ${type.toLowerCase()} with an upcoming effective time.`,
        relevance: `Review how this event may affect your verified ${xstock.xSymbol} holding on Solana.`,
        sourceName: 'xStocks corporate actions', sourceUrl: ACTION_SOURCE,
        occurredAt: new Date(effective).toISOString(), freshness: 'fresh',
        actionHref: contextHref(target), actionLabel: 'Open company',
      });
    }
  }
  return { items, newsCovered, latestAvailable };
}

export async function buildHoldingsBriefing(holdings: VerifiedHoldingRef[], now = Date.now()): Promise<BriefingResponse> {
  const symbols = [...new Set(holdings.map((holding) => holding.ticker))];
  const companies = companyNewsTargets(symbols);
  if (!companies.length) return { state: 'empty_holdings', items: [], coverage: { companies: 0, covered: 0, unavailable: 0, latestAvailable: 0 }, generatedAt: new Date(now).toISOString() };
  const results = await Promise.all(companies.map((company) => companyItems(company, holdings)));
  const covered = results.filter((result) => result.newsCovered).length;
  const latestAvailable = results.filter((result) => result.latestAvailable).length;
  const unavailable = companies.length - covered;
  const items = rankBriefingItems(results.flatMap((result) => result.items), 12, now);
  const state = items.length
    ? unavailable > 0 ? 'partial' : 'ready'
    : unavailable === companies.length ? 'unavailable' : 'no_developments';
  return { state, items, coverage: { companies: companies.length, covered, unavailable, latestAvailable }, generatedAt: new Date(now).toISOString() };
}
