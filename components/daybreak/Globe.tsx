'use client';

import { useEffect, useRef, useCallback } from 'react';
import createGlobe from 'cobe';

interface Marker {
  id: string;
  location: [number, number];
}

interface GlobeProps {
  markers?: Marker[];
  className?: string;
  markerColor?: [number, number, number];
  baseColor?: [number, number, number];
  glowColor?: [number, number, number];
  dark?: number;
  mapBrightness?: number;
  markerSize?: number;
  speed?: number;
  theta?: number;
  diffuse?: number;
  mapSamples?: number;
}

/**
 * Daybreak's horizon globe. Markers only — the arc layer was removed: cobe's
 * arcs render as hard geodesic ribbons that read as stray lines at hero scale.
 */
export function Globe({
  markers = [],
  className = '',
  markerColor = [0.02, 0.09, 0.94],
  baseColor = [1, 1, 1],
  glowColor = [0.78, 0.83, 1],
  dark = 0,
  mapBrightness = 1.8,
  markerSize = 0.032,
  speed = 0.0024,
  theta = 0.22,
  diffuse = 1.2,
  mapSamples = 18000,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lastPointer = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const velocity = useRef({ phi: 0, theta: 0 });
  const phiOffset = useRef(0);
  const thetaOffset = useRef(0);
  const paused = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    lastPointer.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    paused.current = true;
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!pointerStart.current) return;
    dragOffset.current = {
      phi: (e.clientX - pointerStart.current.x) / 320,
      theta: (e.clientY - pointerStart.current.y) / 1000,
    };
    const now = Date.now();
    if (lastPointer.current) {
      const dt = Math.max(now - lastPointer.current.t, 1);
      const cap = 0.12;
      const clamp = (v: number) => Math.max(-cap, Math.min(cap, v));
      velocity.current = {
        phi: clamp(((e.clientX - lastPointer.current.x) / dt) * 0.28),
        theta: clamp(((e.clientY - lastPointer.current.y) / dt) * 0.07),
      };
    }
    lastPointer.current = { x: e.clientX, y: e.clientY, t: now };
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerStart.current) {
      phiOffset.current += dragOffset.current.phi;
      thetaOffset.current += dragOffset.current.theta;
      dragOffset.current = { phi: 0, theta: 0 };
      lastPointer.current = null;
    }
    pointerStart.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    paused.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let frame = 0;
    let phi = 0;

    function start() {
      if (!canvas || globe) return;
      const width = canvas.offsetWidth;
      if (width === 0) return;

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta,
        dark,
        diffuse,
        mapSamples,
        mapBrightness,
        baseColor,
        markerColor,
        glowColor,
        markerElevation: 0.01,
        markers: markers.map((m) => ({ location: m.location, size: markerSize })),
        opacity: 1,
      });

      const tick = () => {
        if (!paused.current && !still) {
          phi += speed;
          if (Math.abs(velocity.current.phi) > 1e-4 || Math.abs(velocity.current.theta) > 1e-4) {
            phiOffset.current += velocity.current.phi;
            thetaOffset.current += velocity.current.theta;
            velocity.current.phi *= 0.95;
            velocity.current.theta *= 0.95;
          }
          const min = -0.35;
          const max = 0.35;
          if (thetaOffset.current < min) thetaOffset.current += (min - thetaOffset.current) * 0.1;
          else if (thetaOffset.current > max) thetaOffset.current += (max - thetaOffset.current) * 0.1;
        }
        globe!.update({
          phi: phi + phiOffset.current + dragOffset.current.phi,
          theta: theta + thetaOffset.current + dragOffset.current.theta,
        });
        frame = requestAnimationFrame(tick);
      };
      tick();
      // Hand the fade to CSS so it can be choreographed after the headline.
      requestAnimationFrame(() => canvas?.classList.add('is-live'));
    }

    if (canvas.offsetWidth > 0) {
      start();
    } else {
      const ro = new ResizeObserver((entries) => {
        if ((entries[0]?.contentRect.width ?? 0) > 0) {
          ro.disconnect();
          start();
        }
      });
      ro.observe(canvas);
      return () => {
        ro.disconnect();
        if (frame) cancelAnimationFrame(frame);
        globe?.destroy();
      };
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      globe?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`db-globe ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} onPointerDown={handlePointerDown} />
    </div>
  );
}

export default Globe;
