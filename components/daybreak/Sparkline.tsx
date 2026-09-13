'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Point { c: number }

// Tiny 24h price-action line for a token, drawn from the chart endpoint's closes.
// The fetch is gated on visibility so a grid of cards doesn't fire dozens of
// chart requests at once; missing data renders a flat baseline rather than error.
export default function Sparkline({ token, up }: { token: string; up?: boolean }) {
  const hostRef = useRef<SVGSVGElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = hostRef.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  const q = useQuery({
    queryKey: ['spark', token],
    enabled: seen,
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/memechart?token=${token}&tf=1H`, { signal });
      const d = await r.json();
      return (d.points as Point[] | undefined)?.map((p) => p.c).filter((n) => Number.isFinite(n)) ?? [];
    },
    staleTime: 5 * 60_000, retry: false,
  });
  const vals = q.data ?? [];
  const stroke = up === false ? '#e5484d' : '#9bec3f';
  const W = 240, H = 44;
  let d = '';
  if (vals.length > 1) {
    const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
    d = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (vals.length - 1)) * W).toFixed(1)},${(H - ((v - min) / span) * (H - 6) - 3).toFixed(1)}`).join(' ');
  }
  return (
    <svg ref={hostRef} className="db-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {d
        ? <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        : <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--db-line)" strokeWidth="1" strokeDasharray="3 4" />}
    </svg>
  );
}
