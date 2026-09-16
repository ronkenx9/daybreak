import { ImageResponse } from 'next/og';
import { DAYBREAK_TOKEN } from '@/lib/base/daybreak-token';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

async function stats() {
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${DAYBREAK_TOKEN.address}`, { cache: 'no-store' });
    const d = await r.json() as { pairs?: Array<Record<string, unknown>> };
    const pairs = (d.pairs || []).filter((p) => ((p.baseToken as { address?: string })?.address || '').toLowerCase() === DAYBREAK_TOKEN.address.toLowerCase());
    const best = (pairs.length ? pairs : d.pairs || []).sort((a, b) => (((b.liquidity as { usd?: number })?.usd) || 0) - (((a.liquidity as { usd?: number })?.usd) || 0))[0];
    if (!best) return null;
    return {
      price: Number(best.priceUsd) || null,
      change: Number((best.priceChange as { h24?: number })?.h24 ?? NaN),
      vol: Number((best.volume as { h24?: number })?.h24) || null,
    };
  } catch { return null; }
}

const money = (n: number | null) => n == null ? '—' : n >= 1 ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '$' + n.toLocaleString('en-US', { maximumSignificantDigits: 2 });

export async function GET() {
  const s = await stats();
  const up = (s?.change ?? 0) >= 0;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: 'linear-gradient(150deg,#0b1120,#0a0f1c)', color: '#eaeefb', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#3a63ff,#0210ef)', color: '#fff', fontSize: 32, fontWeight: 800 }}>D</div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, color: '#4f74ff' }}>daybreak</div>
          <div style={{ marginLeft: 'auto', fontSize: 22, letterSpacing: 3, color: '#8b96ae' }}>DAYC / BASE</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 26, letterSpacing: 4, color: '#8b96ae' }}>$DAYC PRICE</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
            <div style={{ fontSize: 108, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>{money(s?.price ?? null)}</div>
            {s && Number.isFinite(s.change) && (
              <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 12, color: up ? '#37d67a' : '#ff5d55' }}>{`${up ? '+' : '-'}${Math.abs(s.change).toFixed(1)}% 24h`}</div>
            )}
          </div>
          <div style={{ fontSize: 28, color: '#8b96ae' }}>{`24h volume ${money(s?.vol ?? null)} - own a piece of Daybreak`}</div>
        </div>
        <div style={{ fontSize: 26, color: '#c7d4ff' }}>Discover tokenized stocks - make memes - launch tokens on Base</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
