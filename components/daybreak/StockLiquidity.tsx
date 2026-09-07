'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { ArrowUpRight, Check, Copy, Droplets, Sparkles } from 'lucide-react';
import type { StockToken } from '@/lib/base/tokens';
import { markerPosition, stockLpMarket } from '@/lib/base/lp-model';

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

export default function StockLiquidity({ token }: { token: StockToken }) {
  const market = stockLpMarket(token.ticker);
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('50');
  const [copied, setCopied] = useState(false);
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

  if (!market) return <section className="db-lp-unavailable"><Droplets size={24}/><h3>LP route not available yet.</h3><p>Daybreak currently supports stock liquidity for AAPL, NVDA, GOOGL and META. You can still trade or follow this stock.</p></section>;

  const positions = query.data?.wallet?.positions ?? [];
  const prompt = `LP $${amount || '50'} into the ${token.ticker} stock pool on Base using the aero-stock-lp skill`;
  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  };

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

    <div className="db-lp-action">
      <label><span>Start with</span><span className="db-lp-input"><b>$</b><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, '').slice(0, 8))} aria-label="LP amount in US dollars"/></span></label>
      <button className="db-button db-blue-button" onClick={copyPrompt}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'Prompt copied' : 'Copy Bankr prompt'}</button>
      <a className="db-text-link" href="https://bankr.bot" target="_blank" rel="noreferrer">Open Bankr <ArrowUpRight size={15}/></a>
    </div>
    <p className="db-lp-footnote"><Sparkles size={13}/> Bankr checks live price, volatility, wallet balance, gas and pool conditions before it proposes a range. Copying the prompt does not move funds. Review Bankr’s confirmation and its selected wallet before execution; it may differ from the wallet connected to Daybreak.</p>
  </section>;
}
