import 'server-only';
import { baseClient } from '@/lib/base/client';
import { b20Abi } from '@/lib/base/abi';
import { DAYBREAK_TOKEN } from '@/lib/base/daybreak-token';

export const dynamic = 'force-dynamic';

interface Stats { priceUsd: number | null; change24: number | null; liquidityUsd: number | null; volume24: number | null; marketCapUsd: number | null }
let cache: { at: number; stats: Stats } | null = null;

async function fetchStats(): Promise<Stats> {
  if (cache && Date.now() - cache.at < 30_000) return cache.stats;
  const empty: Stats = { priceUsd: null, change24: null, liquidityUsd: null, volume24: null, marketCapUsd: null };
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${DAYBREAK_TOKEN.address}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(9000), cache: 'no-store' });
    if (!r.ok) return empty;
    const data = await r.json() as { pairs?: Array<Record<string, unknown>> };
    const pairs = Array.isArray(data.pairs) ? data.pairs : [];
    // Best pair = the one where DAYC is the base token with the most liquidity.
    const mine = pairs.filter((p) => ((p.baseToken as { address?: string })?.address || '').toLowerCase() === DAYBREAK_TOKEN.address.toLowerCase());
    const best = (mine.length ? mine : pairs).sort((a, b) => (((b.liquidity as { usd?: number })?.usd) || 0) - (((a.liquidity as { usd?: number })?.usd) || 0))[0];
    if (!best) return empty;
    const stats: Stats = {
      priceUsd: Number(best.priceUsd) || null,
      change24: Number((best.priceChange as { h24?: number })?.h24 ?? NaN),
      liquidityUsd: Number((best.liquidity as { usd?: number })?.usd) || null,
      volume24: Number((best.volume as { h24?: number })?.h24) || null,
      marketCapUsd: Number(best.marketCap ?? best.fdv) || null,
    };
    if (!Number.isFinite(stats.change24 as number)) stats.change24 = null;
    cache = { at: Date.now(), stats };
    return stats;
  } catch { return empty; }
}

export async function GET(req: Request) {
  const stats = await fetchStats();
  const address = new URL(req.url).searchParams.get('address');
  let balance: string | null = null, balanceUsd: number | null = null;
  if (address && /^0x[0-9a-fA-F]{40}$/.test(address)) {
    try {
      const raw = await baseClient.readContract({ address: DAYBREAK_TOKEN.address, abi: b20Abi, functionName: 'balanceOf', args: [address as `0x${string}`] });
      const whole = Number(raw) / 10 ** DAYBREAK_TOKEN.decimals;
      balance = whole.toLocaleString('en-US', { maximumFractionDigits: whole < 1 ? 6 : 2 });
      if (stats.priceUsd != null) balanceUsd = whole * stats.priceUsd;
    } catch { /* balance stays null */ }
  }
  return Response.json({ token: DAYBREAK_TOKEN, ...stats, balance, balanceUsd }, { headers: { 'Cache-Control': 'private, no-store' } });
}
