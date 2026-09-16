import 'server-only';
import { USDC_SOLANA_MINT } from './xstocks-registry';
import { xstockByTicker } from './xstocks-registry';

// Jupiter Swap API quote (read-only). Free lite endpoint by default; override with
// JUPITER_API_URL (+ JUPITER_API_KEY) for a keyed plan. We only fetch quotes here;
// execution (build + user-sign + send) is a separate, explicitly gated step.
const JUP = (process.env.JUPITER_API_URL || 'https://lite-api.jup.ag/swap/v1').replace(/\/$/, '');
const KEY = process.env.JUPITER_API_KEY?.trim();
const USDC_DECIMALS = 6;

export interface SwapQuote {
  ticker: string; xSymbol: string; inputMint: string; outputMint: string;
  usdcIn: number; sharesOut: number; minSharesOut: number;
  priceImpactPct: number | null; slippageBps: number; hops: number; source: 'jupiter';
}

export async function fetchUsdcToXstockQuote(ticker: string, usdc: number, slippageBps = 100): Promise<SwapQuote | null> {
  const x = xstockByTicker(ticker);
  if (!x || !(usdc > 0)) return null;
  const amount = Math.round(usdc * 10 ** USDC_DECIMALS);
  const url = new URL(`${JUP}/quote`);
  url.searchParams.set('inputMint', USDC_SOLANA_MINT);
  url.searchParams.set('outputMint', x.mint);
  url.searchParams.set('amount', String(amount));
  url.searchParams.set('slippageBps', String(slippageBps));
  url.searchParams.set('swapMode', 'ExactIn');
  const r = await fetch(url, { headers: { accept: 'application/json', ...(KEY ? { 'x-api-key': KEY } : {}) }, signal: AbortSignal.timeout(9000), cache: 'no-store' }).catch(() => null);
  if (!r || !r.ok) return null;
  const q = await r.json().catch(() => null) as { outAmount?: string; otherAmountThreshold?: string; priceImpactPct?: string; routePlan?: unknown[] } | null;
  if (!q || !q.outAmount) return null;
  const dec = 10 ** x.decimals;
  return {
    ticker: x.ticker, xSymbol: x.xSymbol, inputMint: USDC_SOLANA_MINT, outputMint: x.mint,
    usdcIn: usdc,
    sharesOut: Number(q.outAmount) / dec,
    minSharesOut: Number(q.otherAmountThreshold ?? q.outAmount) / dec,
    priceImpactPct: q.priceImpactPct != null ? Number(q.priceImpactPct) : null,
    slippageBps, hops: Array.isArray(q.routePlan) ? q.routePlan.length : 0, source: 'jupiter',
  };
}
