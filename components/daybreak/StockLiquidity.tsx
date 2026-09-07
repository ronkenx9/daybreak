'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { ArrowUpRight, ChevronLeft, Droplets, ShieldCheck, Sparkles } from 'lucide-react';
import type { StockToken } from '@/lib/base/tokens';
import { markerPosition, stockLpMarket } from '@/lib/base/lp-model';
import { priceState, type StockPrice } from '@/lib/base/model';
import ConnectButton from './ConnectButton';

// Range presets bracket the current price. Percentages are the half-width of the
// band around the reference price; execution aligns to the pool's tick spacing.
const PRESETS = [
  { id: 'focused', label: 'Focused', pct: 0.05, note: 'Tighter range, more fees while in range, exits range sooner' },
  { id: 'balanced', label: 'Balanced', pct: 0.12, note: 'A middle band for everyday moves' },
  { id: 'wide', label: 'Wide', pct: 0.25, note: 'Stays in range longer, earns less per dollar' },
] as const;
type PresetId = (typeof PRESETS)[number]['id'];

interface PoolSnapshot {
  ticker: string; pool: string; feeBps: number;
  reserveUsd: number | null; volume24Usd: number | null; change24Pct: number | null;
  observedAt: string; sourceUrl: string; dataStatus: 'live' | 'unavailable';
}
interface Position {
  ticker: string; tokenId: string; route: 'fees' | 'aero-emissions'; inRange: boolean;
  currentPrice: number; band: { low: number; high: number };
}
interface LpResponse { pool: PoolSnapshot; wallet: { positions: Position[]; partial: boolean } | null }

const money = (value: number | null) => value == null ? 'Unavailable' : value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const price = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export default function StockLiquidity({ token, price: quotePrice }: { token: StockToken; price?: StockPrice }) {
  const market = stockLpMarket(token.ticker);
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('50');
  const [presetId, setPresetId] = useState<PresetId>('balanced');
  const [review, setReview] = useState(false);
  const [slippage, setSlippage] = useState(1);
  // Native LP signing stays gated until it's proven against a funded wallet
  // on-chain; the flow below is a real quote/review, never fabricated execution.
  const executionEnabled = false;
  const wallet = isConnected ? address?.toLowerCase() : undefined;
  const query = useQuery({
    queryKey: ['stock-lp', token.ticker, wallet],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ ticker: token.ticker });
      if (wallet) params.set('address', wallet);
      const response = await fetch(`/api/lp?${params}`, { signal, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'LP data unavailable');
      return data as LpResponse;
    },
    enabled: !!market,
    staleTime: 30_000,
    retry: 1,
  });

  if (!market) return <section className="db-lp-unavailable"><Droplets size={24}/><h3>LP route not available yet.</h3><p>This stock doesn’t have a supported Aerodrome USDC pool on Daybreak yet. You can still trade or follow it.</p></section>;

  const positions = query.data?.wallet?.positions ?? [];
  // Reference price for the band: a live wallet position's pool price if we have
  // one, else the token's oracle reference. Labeled as reference, not a quote.
  const oracle = quotePrice ? priceState(quotePrice) : undefined;
  const centerPrice = positions[0]?.currentPrice ?? (oracle && oracle.state !== 'paused' ? oracle.priceUsd ?? null : null);
  const preset = PRESETS.find((p) => p.id === presetId)!;
  const band = centerPrice != null ? { low: centerPrice * (1 - preset.pct), high: centerPrice * (1 + preset.pct) } : null;
  const amountNum = Number(amount) || 0;

  return <section className="db-lp">
    <div className="db-lp-hero">
      <div><span className="db-eyebrow">Stock liquidity · Base</span><h3>Put {token.ticker} in range.</h3><p>Pair {token.onchainSymbol} with USDC on Aerodrome. Earn trading fees or AERO emissions while the position stays inside its price range.</p></div>
      <div className="db-lp-orbit" aria-hidden="true"><span className="db-lp-sun"/><span className="db-lp-ring"/></div>
    </div>

    {query.isPending ? <div className="db-lp-loading" aria-label="Loading LP market"><span/><span/><span/></div> : query.isError ? <p className="db-data-notice" role="status">LP market data is temporarily unavailable. No activity has been shown as zero.</p> : <>
      <div className="db-lp-stats">
        <div><span>Pool liquidity</span><strong>{money(query.data?.pool.reserveUsd ?? null)}</strong></div>
        <div><span>24h volume</span><strong>{money(query.data?.pool.volume24Usd ?? null)}</strong></div>
        <div><span>Pool fee</span><strong>{market.feeBps / 100}%</strong></div>
      </div>
      <div className="db-lp-source"><span>{query.data?.pool.dataStatus === 'live' ? `Observed ${new Date(query.data.pool.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Market activity unavailable'}</span><a href={query.data?.pool.sourceUrl} target="_blank" rel="noreferrer">View pool <ArrowUpRight size={13}/></a></div>
    </>}

    <div className="db-lp-positions">
      <div className="db-lp-section-head"><div><span className="db-eyebrow">Your range</span><h3>{isConnected ? positions.length ? `${positions.length} position${positions.length === 1 ? '' : 's'} found` : 'No position found' : 'Connect to see your positions'}</h3></div>{query.data?.wallet?.partial && <span className="db-demo-tag">Partial read</span>}</div>
      {positions.map((position) => {
        const marker = markerPosition(position.currentPrice, position.band.low, position.band.high);
        return <article className="db-lp-position" key={position.tokenId}>
          <div className="db-lp-position-top"><span>Position #{position.tokenId}</span><strong className={position.inRange ? 'is-in' : 'is-out'}>{position.inRange ? 'In range' : 'Out of range'}</strong></div>
          <div className="db-lp-range" aria-label={`Range ${price(position.band.low)} to ${price(position.band.high)}; current pool price ${price(position.currentPrice)}`}><span className="db-lp-range-fill"/><span className="db-lp-marker" style={{ left: `${marker}%` }}/></div>
          <div className="db-lp-labels"><span>{price(position.band.low)}</span><strong>{price(position.currentPrice)} now</strong><span>{price(position.band.high)}</span></div>
          <p>{position.route === 'aero-emissions' ? 'Staked · earning AERO emissions while in range' : 'Unstaked · earning pool trading fees while in range'}</p>
        </article>;
      })}
      {isConnected && !query.isPending && !query.isError && positions.length === 0 && <p className="db-small-note">No supported {token.ticker}/USDC Slipstream position was found for this wallet. This does not inspect other protocols.</p>}
    </div>

    {!review ? <div className="db-lp-builder">
      <label className="db-lp-amount"><span>Deposit</span><span className="db-lp-input"><b>$</b><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, '').slice(0, 8))} aria-label="LP amount in US dollars"/><small>USDC</small></span></label>
      <div className="db-lp-presets" role="group" aria-label="Price range">
        {PRESETS.map((p) => <button key={p.id} type="button" aria-pressed={presetId === p.id} className={presetId === p.id ? 'active' : ''} onClick={() => setPresetId(p.id)}><strong>{p.label}</strong><small>±{Math.round(p.pct * 100)}%</small></button>)}
      </div>
      <p className="db-lp-preset-note">{preset.note}.</p>
      {band ? <div className="db-lp-band-preview"><span>{price(band.low)}</span><span className="db-lp-band-center">{centerPrice != null ? `${price(centerPrice)} ref` : ''}</span><span>{price(band.high)}</span></div> : <p className="db-small-note">A live reference price isn’t available right now, so the range can’t be previewed. Try again in a moment.</p>}
      <button className="db-button db-blue-button" disabled={!band || amountNum <= 0} onClick={() => setReview(true)}>Review position <ArrowUpRight size={16}/></button>
      <p className="db-lp-footnote"><Sparkles size={13}/> Powered by Aerodrome Slipstream on Base. Daybreak builds and reviews the position with you here — you sign from your own connected wallet, and you’re never handed off to another site.</p>
    </div> : <div className="db-lp-review">
      <button type="button" className="db-text-link db-lp-back" onClick={() => setReview(false)}><ChevronLeft size={15}/> Edit</button>
      <h3>Review your {token.ticker} position</h3>
      <dl className="db-lp-review-rows">
        <div><dt>Deposit</dt><dd>{price(amountNum)} <small>USDC → paired with {token.onchainSymbol}</small></dd></div>
        <div><dt>Range</dt><dd>{band ? `${price(band.low)} – ${price(band.high)}` : 'Unavailable'} <small>{preset.label} · ±{Math.round(preset.pct * 100)}%</small></dd></div>
        <div><dt>Earns</dt><dd>Pool trading fees while in range <small>Stake the position afterward to earn AERO emissions instead</small></dd></div>
        <div><dt>Pool fee</dt><dd>{market.feeBps / 100}%</dd></div>
        <div><dt>Max slippage</dt><dd><span className="db-lp-slip">{[0.5, 1, 2].map((s) => <button key={s} type="button" aria-pressed={slippage === s} className={slippage === s ? 'active' : ''} onClick={() => setSlippage(s)}>{s}%</button>)}</span></dd></div>
        <div><dt>Network</dt><dd>Base · 8453</dd></div>
        <div><dt>Pool</dt><dd><a className="db-mono-addr" href={`https://basescan.org/address/${market.pool}`} target="_blank" rel="noreferrer">{market.pool.slice(0, 6)}…{market.pool.slice(-4)} ↗</a></dd></div>
        <div><dt>Position manager</dt><dd><a className="db-mono-addr" href={`https://basescan.org/address/${market.npm}`} target="_blank" rel="noreferrer">{market.npm.slice(0, 6)}…{market.npm.slice(-4)} ↗</a></dd></div>
        <div><dt>Signing wallet</dt><dd>{isConnected && address ? <>{address.slice(0, 6)}…{address.slice(-4)} <small>your connected Daybreak wallet</small></> : 'Not connected'}</dd></div>
      </dl>
      <ol className="db-lp-steps"><li>Approve {token.onchainSymbol} and USDC for the position manager</li><li>Mint the concentrated position in your chosen range</li><li>Get a receipt with the token id; refresh your positions</li></ol>
      {!isConnected
        ? <><ConnectButton/><p className="db-lp-footnote"><Sparkles size={13}/> Connect the wallet you’ll provide liquidity from. The position is signed from that wallet inside Daybreak — no redirect.</p></>
        : executionEnabled
        ? <button className="db-button db-blue-button"><ShieldCheck size={16}/> Add liquidity</button>
        : <><button className="db-button db-blue-button" disabled aria-disabled="true"><ShieldCheck size={16}/> Signing not yet enabled</button>
            <p className="db-lp-footnote"><Sparkles size={13}/> This is a real quote/review of the exact position and contracts. Native signing is gated until it’s verified on-chain with a funded wallet — nothing is submitted and no funds move here. Amounts follow the current pool reference and re-quote before any signature.</p></>}
    </div>}
  </section>;
}
