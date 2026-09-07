import 'server-only';
import { TOKENS, tokenForTicker } from './tokens';
import { isAddress } from 'viem';

// "Memestocks": meme tokens that put up liquidity DIRECTLY AGAINST a real
// tokenized-stock (B20) token on Base. We detect them by reading the equity
// token's own liquidity pools (DexScreener) and taking the non-standard side.
// This linkage is a real on-chain pool with a known address, so it can't be
// spoofed by a coin that merely borrows the company's name. Still speculative
// and high-risk; surfaced only filtered and clearly labelled.
export interface MemeToken {
  symbol: string;
  name: string;
  address: string;
  priceUsd: number | null;
  liquidityUsd: number;
  volume24Usd: number; // = volume.h24, kept for the detail view
  volume: { h1: number; h6: number; h24: number };
  change: { h1: number; h6: number; h24: number }; // % price change; can be negative
  marketCapUsd: number | null;
  txns24: number;
  ageMs: number | null;
  url: string;
  pairAddress: string | null; // the DEX pool, for the in-app chart embed
  imageUrl: string | null;    // token logo when DexScreener has one for the meme side
  lowLiquidity: boolean;
}

const MIN_LIQUIDITY = 5_000;
const MIN_VOLUME_24 = 100; // drop the dead, zero-volume long tail
// Standard quote assets are the stock's ordinary market, not a memestock.
const QUOTE = new Set(['USDC', 'USDBC', 'WETH', 'ETH', 'USDT', 'DAI', 'CBBTC', 'EURC']);
const STOCK_ADDRS = new Set(TOKENS.map((t) => t.token.toLowerCase()));

interface DexToken { address?: string; symbol?: string; name?: string }
interface DexPair {
  chainId?: string;
  baseToken?: DexToken;
  quoteToken?: DexToken;
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number; h6?: number; h1?: number };
  priceChange?: { h24?: number; h6?: number; h1?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  marketCap?: number;
  fdv?: number;
  pairCreatedAt?: number;
  pairAddress?: string;
  info?: { imageUrl?: string };
  url?: string;
}

// Only surface an image DexScreener actually served, over https, so we never
// render a wrong or unsafe logo. Returns null otherwise (UI falls back to a monogram).
function safeImage(value: string | undefined): string | null {
  try {
    const url = new URL(value ?? '');
    if (url.protocol === 'https:') return url.toString();
  } catch {}
  return null;
}

export class MemeProviderError extends Error {
  constructor(message = 'Memestock provider unavailable') { super(message); this.name = 'MemeProviderError'; }
}

function isImpersonator(symbol: string, name: string): boolean {
  const s = symbol.toLowerCase();
  const n = name.toLowerCase();
  return s.includes('b20') || n.includes('b20');
}

function dexUrl(value: string | undefined, address: string): string {
  try {
    const url = new URL(value ?? '');
    if (url.protocol === 'https:' && (url.hostname === 'dexscreener.com' || url.hostname.endsWith('.dexscreener.com'))) return url.toString();
  } catch {}
  return `https://dexscreener.com/base/${address}`;
}

export async function fetchMemeTokens(ticker: string): Promise<MemeToken[]> {
  const tok = tokenForTicker(ticker);
  if (!tok) return []; // no equity token → nothing can be paired against it
  const stockAddr = tok.token.toLowerCase();

  let pairs: DexPair[] = [];
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tok.token}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new MemeProviderError(`Memestock provider returned ${r.status}`);
    const data = (await r.json()) as { pairs?: DexPair[] };
    pairs = data.pairs ?? [];
  } catch (error) {
    if (error instanceof MemeProviderError) throw error;
    throw new MemeProviderError();
  }

  const found = new Map<string, MemeToken>();
  for (const p of pairs) {
    if (p.chainId !== 'base') continue;
    // the side of the pool that isn't the equity token
    const baseIsStock = p.baseToken?.address?.toLowerCase() === stockAddr;
    const quoteIsStock = p.quoteToken?.address?.toLowerCase() === stockAddr;
    if (!baseIsStock && !quoteIsStock) continue;
    const other = baseIsStock ? p.quoteToken : p.baseToken;
    const address = other?.address?.toLowerCase() ?? '';
    const symbol = other?.symbol ?? '?';
    const name = other?.name ?? '';
    if (!isAddress(address)) continue;
    if (QUOTE.has(symbol.toUpperCase())) continue; // standard liquidity, not a memestock
    if (STOCK_ADDRS.has(address) || isImpersonator(symbol, name)) continue;
    const liquidityUsd = Math.round(Number(p.liquidity?.usd ?? 0));
    const volume24Usd = Math.round(Number(p.volume?.h24 ?? 0));
    if (!Number.isFinite(liquidityUsd) || !Number.isFinite(volume24Usd) || liquidityUsd < 0 || volume24Usd < 0) continue;
    if (liquidityUsd < MIN_LIQUIDITY || volume24Usd < MIN_VOLUME_24) continue;
    const reportedPrice = p.priceUsd === undefined ? null : Number(p.priceUsd);
    // DexScreener's priceUsd is the base token's USD price. When the stock is
    // the base side it cannot safely be assigned to the quote-side meme token.
    const priceUsd = baseIsStock || reportedPrice === null || !Number.isFinite(reportedPrice) || reportedPrice < 0 ? null : reportedPrice;
    const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
    const marketCapRaw = Number(p.marketCap ?? p.fdv);
    const candidate = {
      symbol,
      name: name.slice(0, 40),
      address,
      priceUsd,
      liquidityUsd,
      volume24Usd,
      volume: { h1: Math.round(Math.max(0, num(p.volume?.h1))), h6: Math.round(Math.max(0, num(p.volume?.h6))), h24: volume24Usd },
      change: { h1: num(p.priceChange?.h1), h6: num(p.priceChange?.h6), h24: num(p.priceChange?.h24) },
      marketCapUsd: Number.isFinite(marketCapRaw) && marketCapRaw > 0 ? Math.round(marketCapRaw) : null,
      txns24: Math.round(Math.max(0, num(p.txns?.h24?.buys) + num(p.txns?.h24?.sells))),
      ageMs: typeof p.pairCreatedAt === 'number' && p.pairCreatedAt > 0 ? Math.max(0, Date.now() - p.pairCreatedAt) : null,
      url: dexUrl(p.url, address),
      // DexScreener returns a mixed-case pairAddress that fails viem's strict
      // checksum; validate loosely and lowercase (the chart route expects that).
      pairAddress: p.pairAddress && /^0x[0-9a-fA-F]{40}$/.test(p.pairAddress) ? p.pairAddress.toLowerCase() : null,
      // info.imageUrl is the base token's logo; only trust it for the meme when the meme IS the base side.
      imageUrl: baseIsStock ? null : safeImage(p.info?.imageUrl),
      lowLiquidity: liquidityUsd < 25_000,
    };
    const previous = found.get(address);
    if (!previous || candidate.volume24Usd > previous.volume24Usd) found.set(address, candidate);
  }
  return [...found.values()].sort((a, b) => b.volume24Usd - a.volume24Usd).slice(0, 12);
}

// ---- Trending feed: per-token queries merged and ranked ----
export interface TrendingMeme extends MemeToken { parentTicker: string; parentSymbol: string }

// The multi-address endpoint caps its response, so the stocks' own USDC pools
// crowd out the memestocks. Query each stock token on its own and merge.
export async function fetchTrending(): Promise<TrendingMeme[]> {
  const results: PromiseSettledResult<TrendingMeme[]>[] = [];
  for (let i = 0; i < TOKENS.length; i += 4) {
    results.push(...await Promise.allSettled(TOKENS.slice(i, i + 4).map(async (t) => {
      const memes = await fetchMemeTokens(t.ticker);
      return memes.map((m): TrendingMeme => ({ ...m, parentTicker: t.ticker, parentSymbol: t.onchainSymbol }));
    })));
  }
  if (!results.some((result) => result.status === 'fulfilled')) throw new MemeProviderError();
  const best = new Map<string, TrendingMeme>();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const m of r.value) {
      const prev = best.get(m.address);
      if (!prev || m.volume24Usd > prev.volume24Usd) best.set(m.address, m);
    }
  }
  // Bound by 24h volume, then let the client re-rank this pool by any column.
  return [...best.values()].sort((a, b) => b.volume24Usd - a.volume24Usd).slice(0, 40);
}
