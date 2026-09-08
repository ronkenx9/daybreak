'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, createSeriesMarkers, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode, type IChartApi, type ISeriesApi, type ISeriesMarkersPluginApi, type Time, type UTCTimestamp } from 'lightweight-charts';

interface Point { t: number; o: number; h: number; l: number; c: number; v: number }
interface Resp { points: Point[]; meta?: { oriented?: boolean; interval?: string; source?: string } }

const TFS = ['1H', '4H', '1D'] as const;
type Tf = (typeof TFS)[number];
const UP = '#0f8a4d', DOWN = '#c33a24';
const fmtPrice = (n: number) => n >= 1 ? `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : `$${n.toPrecision(4).replace(/0+$/, '')}`;

// Interactive OHLCV chart (TradingView lightweight-charts, Apache-2.0): candles/
// line, crosshair with a price/time tooltip, pan/zoom, volume, timeframes, touch
// gestures, and a theme that follows the app. Real GeckoTerminal candles only.
export default function MemeChart({ token, eventTime }: { token: string; up?: boolean; eventTime?: string }) {
  const [tf, setTf] = useState<Tf>('1H');
  const [kind, setKind] = useState<'candles' | 'line'>('candles');
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null);
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const dataRef = useRef<Point[]>([]);
  const [hover, setHover] = useState<{ price: string; time: string } | null>(null);
  const [themeKey, setThemeKey] = useState(0);

  const q = useQuery({
    queryKey: ['memechart', token, tf],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/memechart?token=${token}&tf=${tf}`, { signal });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Chart unavailable');
      return d as Resp;
    },
    staleTime: 120_000,
    retry: 1,
  });
  dataRef.current = q.data?.points ?? [];

  // Re-theme when the app toggles light/dark.
  useEffect(() => {
    const host = wrapRef.current?.closest('.db-app') ?? document.documentElement;
    const obs = new MutationObserver(() => setThemeKey((k) => k + 1));
    obs.observe(host, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const paint = () => {
    const pts = dataRef.current;
    if (!priceRef.current || pts.length < 2) return;
    if (kind === 'candles') (priceRef.current as ISeriesApi<'Candlestick'>).setData(pts.map((p) => ({ time: p.t as UTCTimestamp, open: p.o, high: p.h, low: p.l, close: p.c })));
    else (priceRef.current as ISeriesApi<'Line'>).setData(pts.map((p) => ({ time: p.t as UTCTimestamp, value: p.c })));
    volRef.current?.setData(pts.map((p) => ({ time: p.t as UTCTimestamp, value: p.v, color: (p.c >= p.o ? UP : DOWN) + '55' })));
    const eventSeconds = eventTime ? Math.floor(Date.parse(eventTime) / 1000) : NaN;
    if (markersRef.current && Number.isFinite(eventSeconds) && pts.length) {
      const nearest = pts.reduce((best, point) => Math.abs(point.t - eventSeconds) < Math.abs(best.t - eventSeconds) ? point : best);
      markersRef.current.setMarkers([{ time: nearest.t as UTCTimestamp, position: 'aboveBar', color: '#0210ef', shape: 'circle', text: 'News' }]);
    } else markersRef.current?.setMarkers([]);
    chartRef.current?.timeScale().fitContent();
  };

  // Build (or rebuild) the chart on chart-type / theme change.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
    const ink = v('--db-ink', '#18223c'), line = v('--db-line', '#e7ebf4'), muted = v('--db-muted', '#657089');
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: muted, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', attributionLogo: false },
      grid: { vertLines: { color: line }, horzLines: { color: line } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: line },
      timeScale: { borderColor: line, timeVisible: true, secondsVisible: false },
    });
    const price = kind === 'candles'
      ? chart.addSeries(CandlestickSeries, { upColor: UP, downColor: DOWN, wickUpColor: UP, wickDownColor: DOWN, borderVisible: false })
      : chart.addSeries(LineSeries, { color: '#3a4ae0', lineWidth: 2 });
    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    chart.subscribeCrosshairMove((param) => {
      const d = param.seriesData.get(price) as { close?: number; value?: number } | undefined;
      const val = d?.close ?? d?.value;
      if (!param.time || val == null) { setHover(null); return; }
      setHover({ price: fmtPrice(val), time: new Date((param.time as number) * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) });
    });
    void ink; markersRef.current = createSeriesMarkers(price, []);
    chartRef.current = chart; priceRef.current = price; volRef.current = vol;
    paint();
    return () => { chart.remove(); chartRef.current = null; priceRef.current = null; volRef.current = null; markersRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, themeKey]);

  // Repaint when data (timeframe/token) changes.
  useEffect(() => { paint(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q.data, eventTime]);

  const pts = q.data?.points ?? [];
  const last = pts[pts.length - 1]?.c, first = pts[0]?.c;
  const span = tf === '1D' ? '90 days' : tf === '4H' ? '2 weeks' : '3 days';
  const changePct = pts.length >= 2 && last != null && first != null && first > 0 ? ((last - first) / first) * 100 : null;
  const shortLine = last != null ? `Latest ${fmtPrice(last)}${changePct != null ? ` · ${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%` : ''}` : '—';
  const summary = pts.length >= 2 && last != null && changePct != null
    ? `Latest ${fmtPrice(last)}, ${changePct.toFixed(2)}% over ${span}. Range ${fmtPrice(Math.min(...pts.map((p) => p.l)))} to ${fmtPrice(Math.max(...pts.map((p) => p.h)))}.`
    : '';

  return (
    <div className="db-meme-chart db-meme-chart-i">
      <div className="db-chart-controls">
        <div className="db-chart-tfs" role="group" aria-label="Timeframe">
          {TFS.map((t) => <button key={t} aria-pressed={tf === t} className={tf === t ? 'active' : ''} onClick={() => setTf(t)}>{t}</button>)}
        </div>
        <div className="db-chart-kind" role="group" aria-label="Chart type">
          <button aria-pressed={kind === 'candles'} className={kind === 'candles' ? 'active' : ''} onClick={() => setKind('candles')}>Candles</button>
          <button aria-pressed={kind === 'line'} className={kind === 'line' ? 'active' : ''} onClick={() => setKind('line')}>Line</button>
        </div>
      </div>
      <div className="db-chart-stage">
        <div ref={wrapRef} className="db-chart-canvas" role="img" aria-label={summary || 'Price chart'} />
        {hover && <div className="db-chart-tip"><strong>{hover.price}</strong><span>{hover.time}</span></div>}
        {(q.isPending || q.isError || pts.length < 2) && (
          <div className="db-chart-overlay">
            {q.isPending ? <><span className="db-chart-spinner" /> Loading chart…</> : q.isError ? 'Chart data isn’t available right now.' : 'Not enough data to chart this pool yet.'}
          </div>
        )}
      </div>
      <div className="db-meme-chart-foot"><span>{shortLine}</span><span>Interactive · GeckoTerminal</span></div>
      {summary && <p className="sr-only">{summary}</p>}
    </div>
  );
}
