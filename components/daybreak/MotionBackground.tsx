'use client';
import { useEffect, useRef } from 'react';

// Ambient dot-field behind every app page. Dots brighten and lift toward the
// cursor (base.org-style). Theme-aware, and fully still when the viewer prefers
// reduced motion or has the Reduce-motion setting on.
export default function MotionBackground({ dark, reduced }: { dark: boolean; reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const still = reduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const near = dark ? '120,150,255' : '47,91,255';
    const base = dark ? '70,88,150' : '150,166,200';
    const GAP = 32, R = 1.2, REACH = 150;
    let W = 0, H = 0, dpr = 1, dots: { x: number; y: number; p: number }[] = [], mx = -999, my = -999, loop = 0;

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = GAP / 2; y < H; y += GAP) for (let x = GAP / 2; x < W; x += GAP) dots.push({ x, y, p: Math.random() * 6.283 });
    };
    const paint = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        const n = still ? 0 : Math.max(0, 1 - Math.hypot(d.x - mx, d.y - my) / REACH);
        const bob = still ? 0 : Math.sin(t / 1400 + d.p) * 1.2;
        ctx.beginPath();
        ctx.arc(d.x, d.y + bob, R + n * 1.8, 0, 6.283);
        ctx.fillStyle = `rgba(${n > 0.02 ? near : base},${0.16 + n * 0.7})`;
        ctx.fill();
      }
      if (!still) loop = requestAnimationFrame(paint);
    };
    const onMove = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; };
    const onResize = () => { build(); if (still) paint(0); };

    build();
    if (still) { paint(0); }
    else { window.addEventListener('pointermove', onMove, { passive: true }); loop = requestAnimationFrame(paint); }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(loop);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
    };
  }, [dark, reduced]);

  return <canvas ref={ref} className="db-motion-bg" aria-hidden="true" />;
}
