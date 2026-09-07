'use client';
import { useQuery } from '@tanstack/react-query';

interface Point { t: number; c: number }
interface Resp { points: Point[] }

// Lightweight in-app price chart (48h of hourly closes) drawn as an SVG area.
// Real GeckoTerminal data or an honest empty/error state — never a fabricated line.
export default function MemeChart({ token, up }: { token: string; up?: boolean }) {
  const q = useQuery({
    queryKey: ['memechart', token],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/memechart?token=${token}`, { signal });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Chart unavailable');
      return d as Resp;
    },
    staleTime: 120_000,
    retry: 1,
  });

  if (q.isPending) return <div className="db-meme-chart db-meme-chart-state"><span className="db-chart-spinner" /> Loading chart…</div>;
  if (q.isError || !q.data || q.data.points.length < 3) return <div className="db-meme-chart db-meme-chart-state">Chart data isn’t available for this pool right now.</div>;

  const pts = q.data.points;
  const W = 640, H = 200, P = 6;
  const xs = pts.map((p) => p.t), cs = pts.map((p) => p.c);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minC = Math.min(...cs), maxC = Math.max(...cs);
  const spanX = maxX - minX || 1, spanC = maxC - minC || 1;
  const x = (t: number) => P + ((t - minX) / spanX) * (W - 2 * P);
  const y = (c: number) => P + (1 - (c - minC) / spanC) * (H - 2 * P);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.c).toFixed(1)}`).join(' ');
  const area = `${line} L${x(maxX).toFixed(1)} ${H - P} L${x(minX).toFixed(1)} ${H - P} Z`;
  const rising = up ?? cs[cs.length - 1] >= cs[0];
  const stroke = rising ? '#0f8a4d' : '#c33a24';
  const fill = rising ? 'rgba(15,138,77,.12)' : 'rgba(195,58,36,.12)';

  return (
    <div className="db-meme-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="48-hour price chart" className="db-meme-chart-svg">
        <path d={area} fill={fill} stroke="none" />
        <path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="db-meme-chart-foot"><span>48h</span><span>Hourly closes · GeckoTerminal</span></div>
    </div>
  );
}
