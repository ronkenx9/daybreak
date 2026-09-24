import { DaybreakApiError, DaybreakClient } from './daybreak-client.js';
import { ConversationMemory } from './memory.js';
import type { CompanyContext, StockDiscovery, Thesis } from './types.js';

const SYMBOL_ALIASES: Record<string, string> = {
  apple: 'AAPL', aapl: 'AAPL', aaplx: 'AAPL', aaplc: 'AAPL',
  amazon: 'AMZN', amzn: 'AMZN', amznx: 'AMZN', amznc: 'AMZN',
  alphabet: 'GOOGL', google: 'GOOGL', googl: 'GOOGL', googlx: 'GOOGL', googlc: 'GOOGL',
  nvidia: 'NVDA', nvda: 'NVDA', nvdax: 'NVDA', nvdac: 'NVDA',
  tesla: 'TSLA', tsla: 'TSLA', tslax: 'TSLA', tslac: 'TSLA',
  meta: 'META', facebook: 'META', metax: 'META', metac: 'META',
  microsoft: 'MSFT', msft: 'MSFT', msftx: 'MSFT', msftc: 'MSFT',
  coinbase: 'COIN', coin: 'COIN', coinx: 'COIN', coinc: 'COIN',
  circle: 'CRCL', crcl: 'CRCL', crclc: 'CRCL',
  intel: 'INTC', intc: 'INTC', intcx: 'INTC', intcc: 'INTC',
  microstrategy: 'MSTR', strategy: 'MSTR', mstr: 'MSTR', mstrx: 'MSTR', mstrc: 'MSTR',
  sandisk: 'SNDK', sndk: 'SNDK', sndkc: 'SNDK',
  spacex: 'SPACEX', anduril: 'ANDURIL', anthropic: 'ANTHROPIC',
  openai: 'OPENAI', kalshi: 'KALSHI', neuralink: 'NEURALINK',
  polymarket: 'POLYMARKET', figureai: 'FIGUREAI',
};

const PUBLIC_SYMBOLS = new Set(['AAPL', 'AMZN', 'GOOGL', 'NVDA', 'TSLA', 'META', 'MSFT', 'COIN', 'CRCL', 'INTC', 'MSTR', 'SNDK']);
const PRIVATE_SYMBOLS = new Set(['SPACEX', 'ANDURIL', 'ANTHROPIC', 'OPENAI', 'KALSHI', 'NEURALINK', 'POLYMARKET', 'FIGUREAI']);
const HELP = `I’m Daybreak in iMessage. Try:\n• “NVDA price”\n• “What’s happening with Tesla?”\n• “paper theses on Apple”\n• “find stock tokens for Microsoft”\n• “create a thesis on NVDA”\n\nI use Daybreak’s public data. Trades and thesis publishing open in Daybreak for your review.`;

function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return ['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function extractSymbol(text: string): string | undefined {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const word of words) {
    const symbol = SYMBOL_ALIASES[word];
    if (symbol) return symbol;
  }
  return undefined;
}

function money(value: string | null): string {
  if (value === null || !Number.isFinite(Number(value))) return 'unavailable';
  return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function time(value: string | null): string {
  if (!value) return 'time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'time unavailable' : `${date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })} UTC`;
}

function ageLabel(stale: boolean) {
  return stale ? 'aged reference' : 'reference';
}

function instrumentLabel(item: StockDiscovery) {
  const instruments = item.instruments.slice(0, 3).map((instrument) => `${instrument.symbol} (${instrument.namespace.startsWith('solana') ? 'Solana' : 'Base'})`);
  return instruments.length ? instruments.join(', ') : 'No listed token instrument';
}

function headlineLines(context: CompanyContext) {
  return context.headlines.slice(0, 3).flatMap((headline, index) => {
    const title = typeof headline.title === 'string' ? headline.title.trim() : '';
    if (!title) return [];
    const source = typeof headline.source === 'string' && headline.source.trim() ? ` — ${headline.source.trim()}` : '';
    const link = safeUrl(headline.url);
    return [`${index + 1}. ${title}${source}${link ? `\n${link}` : ''}`];
  });
}

function thesisLines(items: Thesis[]) {
  return items.slice(0, 3).map((item, index) => {
    const mode = item.mode === 'paper' ? 'Paper' : 'Live';
    const author = item.authorKind === 'agent' ? 'agent' : 'human';
    const link = safeUrl(item.url);
    return `${index + 1}. ${item.title}\n${mode} • ${author}${typeof item.paperTradeCount === 'number' ? ` • ${item.paperTradeCount} paper trades` : ''}${link ? `\n${link}` : ''}`;
  });
}

function trimReply(reply: string, max: number): string {
  if (reply.length <= max) return reply;
  return `${reply.slice(0, Math.max(0, max - 18)).trimEnd()}…\nOpen Daybreak for more.`;
}

export class DaybreakConversation {
  constructor(
    private readonly client: DaybreakClient,
    private readonly appBase: string,
    private readonly memory = new ConversationMemory(),
    private readonly maxReplyChars = 1_450,
  ) {}

  private companyUrl(symbol: string) {
    return new URL(`/app?stock=${encodeURIComponent(symbol)}`, this.appBase).toString();
  }

  private convictionUrl(symbol?: string, create = false) {
    const url = new URL('/app/conviction', this.appBase);
    if (symbol) url.searchParams.set('stock', symbol);
    if (create) url.searchParams.set('create', 'paper');
    return url.toString();
  }

  private symbol(text: string, spaceId: string): string | undefined {
    const found = extractSymbol(text);
    if (found) this.memory.remember(spaceId, found);
    return found ?? this.memory.recall(spaceId);
  }

  async respond(rawText: string, spaceId: string): Promise<string> {
    const text = rawText.replace(/\s+/g, ' ').trim();
    if (!text) return HELP;
    const lower = text.toLowerCase();
    if (/^(help|menu|start|what can you do|commands)[?!. ]*$/.test(lower) || /how (do|can) (i|you)/.test(lower)) return HELP;
    if (/^(hi|hey|hello|yo|gm|good (morning|afternoon|evening))[?!. ]*$/.test(lower)) {
      return `Hey — I’m Daybreak. Text me a company or stock token and what you want to know.\n\n${HELP}`;
    }

    const symbol = this.symbol(text, spaceId);
    try {
      if (/\b(create|publish|launch|write|make)\b.*\b(thesis|conviction)\b|\b(thesis|conviction)\b.*\b(create|publish|launch|write|make)\b/.test(lower)) {
        if (!symbol) return `Which company should the thesis be about? Try “create a thesis on NVDA.”`;
        return `Create a public paper thesis for ${symbol} in Daybreak, then review every detail before publishing:\n${this.convictionUrl(symbol, true)}\n\nNothing is published from this text conversation.`;
      }

      if (/\b(buy|sell|trade|back|position|order)\b/.test(lower)) {
        if (!symbol) return `Tell me the company or stock token first — for example, “trade an NVDA thesis.”`;
        return `Choose a ${symbol} conviction market in Daybreak, review the quote, then confirm there:\n${this.convictionUrl(symbol)}\n\nI don’t place trades or move funds from iMessage.`;
      }

      if (/\b(news|headline|happening|context|update|updates|story|stories|circle|community)\b/.test(lower)) {
        if (!symbol) return `Which company? Try “What’s happening with Tesla?”`;
        const result = await this.client.context(symbol, 3);
        const lines = headlineLines(result.data);
        const circles = result.data.circles.length ? `${result.data.circles.length} related public Circle${result.data.circles.length === 1 ? '' : 's'}` : 'No related public Circle listed';
        return trimReply(`${result.data.company.name} (${result.data.company.symbol})\n${lines.length ? lines.join('\n\n') : 'No recent linked headlines are available right now.'}\n\n${circles}\nOpen the company: ${this.companyUrl(symbol)}`, this.maxReplyChars);
      }

      if (/\b(thesis|theses|conviction|market|markets|idea|ideas)\b/.test(lower)) {
        const mode = /\bpaper\b/.test(lower) ? 'paper' : /\blive\b/.test(lower) ? 'live' : undefined;
        const result = await this.client.theses(symbol ?? '', mode, 5);
        const lines = thesisLines(result.data.items);
        if (!lines.length) return `${symbol ? `No ${mode ?? 'public'} theses for ${symbol}` : 'No matching public theses'} are available right now.\nExplore Daybreak: ${this.convictionUrl(symbol)}`;
        return trimReply(`${symbol ? `${symbol} public conviction markets` : 'Public conviction markets'}${mode ? ` • ${mode}` : ''}\n\n${lines.join('\n\n')}\n\nExplore all: ${this.convictionUrl(symbol)}`, this.maxReplyChars);
      }

      if (/\b(price|quote|worth|trading at|reference)\b/.test(lower)) {
        if (!symbol) return `Which listed company? Try “NVDA price.”`;
        if (!PUBLIC_SYMBOLS.has(symbol)) return `${symbol} is a private-company pre-stock listing, so Daybreak doesn’t present an underlying public-equity reference price.\nOpen it: ${this.companyUrl(symbol)}`;
        const result = await this.client.market(symbol);
        return `${symbol} ${ageLabel(result.data.stale)}: ${money(result.data.price)}\nSource: ${result.data.source} • ${time(result.data.asOf)}\n\nUnderlying share reference only — not an executable stock-token quote.\n${this.companyUrl(symbol)}`;
      }

      if (/\b(find|discover|list|search|show|token|tokens|stock|stocks|pre[- ]?ipo|private)\b/.test(lower) || symbol) {
        const query = symbol ?? text.replace(/\b(find|discover|list|search|show|me|stock|stocks|token|tokens|for|on|about|please)\b/gi, ' ').replace(/\s+/g, ' ').trim();
        const result = await this.client.discover(query, symbol ? 3 : 8);
        const items = result.data.items.filter((item) => /\b(pre[- ]?ipo|private)\b/.test(lower) ? item.classification === 'private' : true).slice(0, symbol ? 3 : 6);
        if (!items.length) return `I couldn’t find that in Daybreak’s supported stock-token catalog. Try a ticker like NVDA, AAPL, TSLA, or a private company like SpaceX.`;
        if (symbol && PUBLIC_SYMBOLS.has(symbol)) {
          const [market, item] = await Promise.all([this.client.market(symbol), Promise.resolve(items[0])]);
          if (!item) return `I couldn’t find ${symbol} in Daybreak right now.`;
          return trimReply(`${item.name} (${item.symbol})\nReference: ${money(market.data.price)} • ${ageLabel(market.data.stale)}\nTokens: ${instrumentLabel(item)}\n\nText “news ${symbol}” or “theses ${symbol}” to go deeper.\n${this.companyUrl(symbol)}`, this.maxReplyChars);
        }
        const lines = items.map((item, index) => `${index + 1}. ${item.name} (${item.symbol})\n${instrumentLabel(item)}`);
        return trimReply(`Daybreak stock-token matches\n\n${lines.join('\n\n')}\n\nOpen discovery: ${new URL('/app', this.appBase).toString()}`, this.maxReplyChars);
      }

      return HELP;
    } catch (error) {
      if (error instanceof DaybreakApiError && error.status === 404) {
        return `I couldn’t find that company in Daybreak’s supported catalog. Try a ticker like NVDA, AAPL, TSLA, or SpaceX.`;
      }
      return `Daybreak’s market data is temporarily unavailable. Try again in a moment, or open the app: ${new URL('/app', this.appBase).toString()}`;
    }
  }
}

export { HELP, PRIVATE_SYMBOLS, PUBLIC_SYMBOLS, extractSymbol };
