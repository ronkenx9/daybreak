import 'server-only';
import { TOKENS, tokenForTicker } from './tokens';

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
  volume24Usd: number;
  url: string;
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
  volume?: { h24?: number };
  url?: string;
}

function isImpersonator(symbol: string, name: string): boolean {
  const s = symbol.toLowerCase();
  const n = name.toLowerCase();
  return s.includes('b20') || n.includes('b20');
}

export async function fetchMemeTokens(ticker: string): Promise<MemeToken[]> {
  const tok = tokenForTicker(ticker);
  if (!tok) return []; // no equity token → nothing can be paired against it
  const stockAddr = tok.token.toLowerCase();

  let pairs: DexPair[] = [];
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tok.token}`, { headers: { accept: 'application/json' } });
    if (!r.ok) return [];
    const data = (await r.json()) as { pairs?: DexPair[] };
    pairs = data.pairs ?? [];
  } catch {
    return [];
  }

  const seen = new Set<string>();
  const out: MemeToken[] = [];
  for (const p of pairs) {
    if (p.chainId !== 'base') continue;
    // the side of the pool that isn't the equity token
    const baseIsStock = p.baseToken?.address?.toLowerCase() === stockAddr;
    const other = baseIsStock ? p.quoteToken : p.baseToken;
    const address = other?.address?.toLowerCase() ?? '';
    const symbol = other?.symbol ?? '?';
    const name = other?.name ?? '';
    if (!address || seen.has(address)) continue;
    if (QUOTE.has(symbol.toUpperCase())) continue; // standard liquidity, not a memestock
    if (STOCK_ADDRS.has(address) || isImpersonator(symbol, name)) continue;
    const liquidityUsd = Math.round(p.liquidity?.usd ?? 0);
    const volume24Usd = Math.round(p.volume?.h24 ?? 0);
    if (liquidityUsd < MIN_LIQUIDITY || volume24Usd < MIN_VOLUME_24) continue;
    seen.add(address);
    out.push({
      symbol,
      name: name.slice(0, 40),
      address,
      priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
      liquidityUsd,
      volume24Usd,
      url: p.url ?? `https://dexscreener.com/base/${address}`,
      lowLiquidity: liquidityUsd < 25_000,
    });
  }
  return out.sort((a, b) => b.volume24Usd - a.volume24Usd).slice(0, 12);
}

// ---- Trending feed: per-token queries merged and ranked ----
export interface TrendingMeme extends MemeToken { parentTicker: string; parentSymbol: string }

// The multi-address endpoint caps its response, so the stocks' own USDC pools
// crowd out the memestocks. Query each stock token on its own and merge.
export async function fetchTrending(): Promise<TrendingMeme[]> {
  const results = await Promise.allSettled(
    TOKENS.map(async (t) => {
      const memes = await fetchMemeTokens(t.ticker);
      return memes.map((m): TrendingMeme => ({ ...m, parentTicker: t.ticker, parentSymbol: t.onchainSymbol }));
    }),
  );
  const best = new Map<string, TrendingMeme>();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const m of r.value) {
      const prev = best.get(m.address);
      if (!prev || m.volume24Usd > prev.volume24Usd) best.set(m.address, m);
    }
  }
  return [...best.values()].sort((a, b) => b.volume24Usd - a.volume24Usd).slice(0, 24);
}
