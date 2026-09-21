import { OKX_PUBLIC_TOOLS, OKX_CONNECTED_TOOLS, discoverStockTokens, limitArg, optionalString, stringArg } from '@/lib/okx/catalog';
import { companyForSymbol, COMPANIES } from '@/lib/assets/companies';
import { listPublicCircles } from '@/lib/db/repo';
import { getPublicThesis, listPublishedTheses } from '@/lib/db/repo-theses';
import { requireAgent, readAgentJson } from '@/lib/agents/auth';
import { AgentApiError, agentErrorResponse } from '@/lib/agents/errors';
import { normalizeAgentPaperThesis, requireIdempotencyKey } from '@/lib/agents/validation';
import { requireThesisInstrument } from '@/lib/theses/instruments';
import { createRateLimit } from '@/lib/server/requests';
import { GET as equityPrices } from '@/app/api/equity-prices/route';
import { GET as companyNews } from '@/app/api/news/route';
import { GET as preStockNews } from '@/app/api/prestocks/news/route';
import { GET as paperActivity } from '@/app/api/v1/agents/theses/[id]/activity/route';
import { GET as me } from '@/app/api/v1/agents/me/route';
import { GET as operation } from '@/app/api/v1/agents/requests/[idempotencyKey]/route';
import { GET as flashOrders } from '@/app/api/v1/agents/flash/orders/route';
import { POST as publishPaper } from '@/app/api/v1/agents/paper/theses/route';
import { POST as quotePaper } from '@/app/api/v1/agents/paper/quotes/route';
import { POST as tradePaper } from '@/app/api/v1/agents/paper/trades/route';
import { POST as flashQuote } from '@/app/api/v1/agents/flash/quotes/route';

export const dynamic = 'force-dynamic';
const PUBLIC = new Set<string>(OKX_PUBLIC_TOOLS.map((tool) => tool.name));
const CONNECTED = new Set<string>(OKX_CONNECTED_TOOLS.map((tool) => tool.name));
const BASE = 'https://www.daybreakcircles.lol';
const allowed = createRateLimit(120);

function url(path: string) { return `${BASE}${path}`; }
function upstream(request: Request, args: Record<string, unknown>, method: 'GET'|'POST' = 'POST') {
  return new Request(request.url, { method, headers: {
    authorization: request.headers.get('authorization') ?? '',
    'content-type': 'application/json',
    'idempotency-key': request.headers.get('idempotency-key') ?? '',
  }, ...(method === 'POST' ? { body: JSON.stringify(args) } : {}) });
}
async function unwrap(response: Response) {
  const body = await response.json();
  if (!response.ok) return Response.json(body, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  return body;
}
function result(requestId: string, data: unknown, coverage: string = 'complete') {
  return Response.json({ schemaVersion: '2026-09-21', requestId, fetchedAt: new Date().toISOString(), coverage, data }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET() {
  return Response.json({ name: 'Daybreak on OKX AI', version: '2026-09-21', publicTools: OKX_PUBLIC_TOOLS, connectedTools: OKX_CONNECTED_TOOLS,
    authentication: 'Connected tools require a scoped Daybreak agent Bearer key in the Authorization header. Never put keys in tool arguments or chat messages.',
    live: 'Flash quote preparation is supported for a stock token paired with a published live thesis. Wallet signing and order submission remain separate.',
    docs: url('/agents/llms.txt') }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (!allowed()) throw new AgentApiError('RATE_LIMITED', 'Please retry shortly', 429, true);
    const body = await readAgentJson(request, 12_288);
    const tool = stringArg(body, 'tool', 64);
    const args = body.arguments === undefined ? {} : body.arguments;
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw new AgentApiError('INVALID_INPUT', 'arguments must be an object');
    const input = args as Record<string, unknown>;
    if (!PUBLIC.has(tool) && !CONNECTED.has(tool)) throw new AgentApiError('INVALID_INPUT', 'Unknown tool');
    if (CONNECTED.has(tool)) await requireAgent(request, tool === 'publish_paper_thesis' ? 'paper:publish' : ['quote_paper_trade','execute_paper_trade'].includes(tool) ? 'paper:trade' : 'read');

    if (tool === 'discover_stock_tokens') return result(requestId, { items: discoverStockTokens(optionalString(input,'query'), limitArg(input.limit)) });
    if (tool === 'get_stock_market_data') {
      const symbol = stringArg(input,'symbol',20).toUpperCase();
      const company = companyForSymbol(symbol);
      if (!company || company.classification !== 'public') throw new AgentApiError('NOT_FOUND','Public equity ticker not found',404);
      const response = await equityPrices(new Request(`${BASE}/api/equity-prices?tickers=${encodeURIComponent(company.symbol)}`));
      const data = await unwrap(response); if (data instanceof Response) return data;
      const price = data.prices?.[company.symbol] ?? null;
      return result(requestId, { company: company.symbol, kind: 'underlying_equity_reference_usd', price: price?.priceUsd == null ? null : String(price.priceUsd), source: price?.source ?? 'unavailable', asOf: price?.asOf ? new Date(price.asOf * (price.asOf < 1e12 ? 1000 : 1)).toISOString() : null, stale: price?.stale ?? true, market: data.market, note: 'Not an executable stock-token quote.' }, price?.priceUsd == null ? 'unavailable' : price.stale ? 'stale' : 'complete');
    }
    if (tool === 'get_company_context') {
      const symbol = stringArg(input,'symbol',20).toUpperCase();
      const company = COMPANIES.find((entry) => entry.symbol === symbol);
      if (!company) throw new AgentApiError('NOT_FOUND','Company not found',404);
      const circles = await listPublicCircles();
      const relatedCircles = circles.filter((circle) => circle.tickers.includes(symbol)).slice(0,5).map((circle) => ({...circle,url:url('/app/groups')}));
      const newsRoute = company.newsProvider === 'prestocks' ? preStockNews : companyNews;
      const newsPath = company.newsProvider === 'prestocks' ? `/api/prestocks/news?symbol=${encodeURIComponent(symbol)}` : `/api/news?ticker=${encodeURIComponent(symbol)}`;
      const newsResponse = company.newsProvider === 'none' ? null : await newsRoute(new Request(url(newsPath)));
      const raw = newsResponse?.ok ? await newsResponse.json() : null;
      const articles = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
      const headlines = articles.slice(0,limitArg(input.limit,5,10)).map((article: Record<string,unknown>) => ({ title: article.title, source: article.source, url: article.url, seenAt: article.seenAt }));
      return result(requestId, { company, circles: relatedCircles, headlines, newsStatus: newsResponse?.ok ? 'available' : 'unavailable', newsStale: raw?.stale === true }, newsResponse?.ok ? raw?.stale === true ? 'stale' : 'complete' : 'partial');
    }
    if (tool === 'find_theses') {
      const mode = optionalString(input,'mode',5); if (mode && !['paper','live'].includes(mode)) throw new AgentApiError('INVALID_INPUT','mode must be paper or live');
      const actor = optionalString(input,'actor',5); if (actor && !['human','agent'].includes(actor)) throw new AgentApiError('INVALID_INPUT','actor must be human or agent');
      const limit = limitArg(input.limit,10,25);
      const rows = await listPublishedTheses(limit+1,{ mode:mode||undefined, actorKind:actor||undefined, query:optionalString(input,'query'), offset:0 });
      return result(requestId,{ items:rows.slice(0,limit).map((row)=>({
        id:row.id, title:row.title, summary:row.summary, companyId:row.companyId,
        instrumentId:row.instrumentId, tokenSymbol:row.tokenSymbol, mode:row.mode,
        status:row.status, publishedAt:row.publishedAt, authorKind:row.authorKind,
        authorPublicId:row.authorPublicId, paperTradeCount:row.paperTradeCount,
        url:url(`/theses/${row.slug}`),
      })),hasMore:rows.length>limit });
    }
    if (tool === 'get_thesis' || tool === 'get_thesis_activity') {
      const id = stringArg(input,'id',100);
      const thesis = await getPublicThesis(id);
      if (!thesis) throw new AgentApiError('NOT_FOUND','Thesis not found',404);
      if (tool === 'get_thesis') return result(requestId,{ thesis, url:url(`/theses/${thesis.slug}`) });
      if (thesis.mode !== 'paper') throw new AgentApiError('INVALID_INPUT','Public activity tool currently supports paper markets only');
      const response = await paperActivity(new Request(request.url),{params:Promise.resolve({id:thesis.id})});
      const data = await unwrap(response); return data instanceof Response ? data : result(requestId,data);
    }
    if (tool === 'prepare_paper_thesis') {
      const normalized = normalizeAgentPaperThesis(input);
      const instrument = requireThesisInstrument(normalized.instrumentId,'create');
      return result(requestId,{ thesis:normalized, instrument:{id:instrument.id,symbol:instrument.symbol,mint:instrument.mint}, visibility:'public', mode:'paper', action:'Use publish_paper_thesis with a stable Idempotency-Key after approval.' });
    }
    if (tool === 'get_my_daybreak') { const data=await unwrap(await me(upstream(request,input,'GET'))); return data instanceof Response?data:result(requestId,data); }
    if (tool === 'publish_paper_thesis' || tool === 'execute_paper_trade') requireIdempotencyKey(request);
    if (tool === 'publish_paper_thesis') { const data=await unwrap(await publishPaper(upstream(request,input))); return data instanceof Response?data:result(requestId,data); }
    if (tool === 'quote_paper_trade') { const data=await unwrap(await quotePaper(upstream(request,input))); return data instanceof Response?data:result(requestId,data); }
    if (tool === 'execute_paper_trade') { const data=await unwrap(await tradePaper(upstream(request,input))); return data instanceof Response?data:result(requestId,data); }
    if (tool === 'get_operation') { const key=stringArg(input,'idempotencyKey',128); const data=await unwrap(await operation(upstream(request,input,'GET'),{params:Promise.resolve({idempotencyKey:key})}));return data instanceof Response?data:result(requestId,data); }
    if (tool === 'prepare_flash_order') { const data=await unwrap(await flashQuote(upstream(request,input))); return data instanceof Response?data:result(requestId,data); }
    if (tool === 'get_flash_order') { const data=await unwrap(await flashOrders(upstream(request,input,'GET'))); return data instanceof Response?data:result(requestId,data); }
    throw new AgentApiError('INVALID_INPUT','Unknown tool');
  } catch(error) {
    if (error instanceof Error && !(error instanceof AgentApiError) && /^(?:limit|query|symbol|tool|id|mode|actor|arguments)/.test(error.message)) return agentErrorResponse(new AgentApiError('INVALID_INPUT',error.message),requestId);
    return agentErrorResponse(error,requestId);
  }
}
