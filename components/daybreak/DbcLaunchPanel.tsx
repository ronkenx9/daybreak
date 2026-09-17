'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Rocket, ExternalLink, Check, AlertTriangle } from 'lucide-react';
import { useAccountState } from './AccountProvider';

interface LaunchBuild {
  transactionBase64: string; poolAddress: string; configAddress: string;
  baseMint: string; quoteMint: string; band: { initialMarketCap: number; migrationMarketCap: number };
  requiresSigner: string;
}
interface PoolStatus {
  pool: string; curveProgressPct: number; graduated: boolean;
  quoteReserve: string; migrationThreshold: string; pricePerToken: string | null;
}

const usd = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

// Daybreak's NATIVE Solana launch rail on Meteora's Dynamic Bonding Curve. Unlike the
// Base launch portal, buying happens on our own curve (no offramp). The curve is tuned
// for equity-like assets: an IPO-style decaying fee, a price band anchored to a real
// reference valuation, and graduation into Meteora DAMM v2 liquidity.
export default function DbcLaunchPanel() {
  const account = useAccountState();
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [reference, setReference] = useState('60000');
  const [build, setBuild] = useState<LaunchBuild | null>(null);
  const [phase, setPhase] = useState<'idle' | 'building' | 'signing' | 'done'>('idle');
  const [error, setError] = useState('');
  const [signature, setSignature] = useState('');

  const refNum = Number(reference);
  const band = build?.band;

  const doBuild = async () => {
    setError(''); setPhase('building'); setBuild(null); setSignature('');
    try {
      const r = await fetch('/api/solana/dbc/launch', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ creator: account.solanaWallet, name, symbol, uri: 'https://www.daybreakcircles.lol/api/dbc/metadata', referenceValuationUsd: refNum }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not build the launch');
      setBuild(d as LaunchBuild); setPhase('idle');
    } catch (e) { setError(e instanceof Error ? e.message : 'Build failed'); setPhase('idle'); }
  };

  const doSignAndLaunch = async () => {
    if (!build) return;
    setError(''); setPhase('signing');
    try {
      const signed = await account.signSolanaTransaction(build.transactionBase64);
      const r = await fetch('/api/solana/dbc/submit', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ signedTransaction: signed }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Submit failed');
      setSignature(d.signature); setPhase('done');
    } catch (e) { setError(e instanceof Error ? e.message : 'Launch failed'); setPhase('idle'); }
  };

  const canBuild = account.authenticated && !!account.solanaWallet && name.trim().length > 0 && symbol.trim().length > 0 && Number.isFinite(refNum) && refNum > 0;

  return (
    <section className="db-launch-portal db-dbc-panel" aria-label="Native launch on Solana">
      <div className="db-section-heading"><div><span className="db-eyebrow">Native on Solana · Meteora DBC</span><h2>Launch on a bonding curve.</h2></div></div>
      <p className="db-small-note">Buying happens on Daybreak’s own Meteora Dynamic Bonding Curve — not an offramp. The curve is tuned for equity-like assets.</p>

      <div className="db-dbc-mechanics">
        <div><span>Opening fee</span><strong className="db-shine">5.0% → 1.0%</strong><small>IPO-style decay over the first hour</small></div>
        <div><span>Price band</span><strong className="db-shine">{band ? `${usd(band.initialMarketCap)} → ${usd(band.migrationMarketCap)}` : 'anchored to reference'}</strong><small>Start and graduation, from your reference</small></div>
        <div><span>Graduation</span><strong className="db-shine">DAMM v2</strong><small>Migrates into real AMM liquidity</small></div>
      </div>

      <div className="db-dbc-form">
        <label>Token name<input value={name} maxLength={32} placeholder="Nvidia Circle" onChange={(e) => setName(e.target.value)} /></label>
        <label>Symbol<input value={symbol} maxLength={10} placeholder="NVDAC" onChange={(e) => setSymbol(e.target.value.toUpperCase())} /></label>
        <label>Reference valuation (USD)<input value={reference} inputMode="numeric" placeholder="60000" onChange={(e) => setReference(e.target.value.replace(/[^0-9.]/g, ''))} /><small>The real valuation the curve’s price band is anchored to.</small></label>
      </div>

      {!account.authenticated ? <p className="db-small-note">Sign in to launch.</p>
        : !account.solanaWallet ? <p className="db-small-note">Your Solana wallet is loading…</p>
        : null}

      <div className="db-dbc-gate"><AlertTriangle size={16} /><p>Launching creates the pool on Solana mainnet. Your Solana wallet pays the network rent and signs — signing is always a separate, explicit step, and no funds move until you approve it.</p></div>

      {!build
        ? <button className="db-button db-blue-button" disabled={!canBuild || phase === 'building'} onClick={doBuild}><Rocket size={17} /> {phase === 'building' ? 'Building…' : 'Build launch'}</button>
        : phase === 'done'
          ? <LaunchSuccess signature={signature} pool={build.poolAddress} baseMint={build.baseMint} />
          : <div className="db-dbc-review">
              <dl>
                <div><dt>Pool</dt><dd><code>{build.poolAddress.slice(0, 8)}…{build.poolAddress.slice(-6)}</code></dd></div>
                <div><dt>Token mint</dt><dd><code>{build.baseMint.slice(0, 8)}…{build.baseMint.slice(-6)}</code></dd></div>
                <div><dt>Quote</dt><dd>USDC</dd></div>
                <div><dt>Price band</dt><dd>{usd(build.band.initialMarketCap)} → {usd(build.band.migrationMarketCap)}</dd></div>
              </dl>
              <button className="db-button db-blue-button" disabled={phase === 'signing'} onClick={doSignAndLaunch}>{phase === 'signing' ? 'Waiting for signature…' : 'Sign & launch on Solana'}</button>
              <button className="db-text-link" onClick={() => setBuild(null)}>Start over</button>
            </div>}

      {error && <p className="db-trade-error" role="alert">{error}</p>}
    </section>
  );
}

function LaunchSuccess({ signature, pool, baseMint }: { signature: string; pool: string; baseMint: string }) {
  const status = useQuery({
    queryKey: ['dbc-pool', pool],
    enabled: !!pool,
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/solana/dbc/pool?address=${pool}`, { signal });
      if (!r.ok) throw new Error('unavailable');
      return r.json() as Promise<PoolStatus>;
    },
    refetchInterval: 15_000, retry: 2,
  });
  const s = status.data;
  return (
    <div className="db-launch-success" aria-live="polite">
      <div className="db-launch-success-mark"><Check size={34} /></div>
      <span className="db-eyebrow">Live on Solana</span>
      <h3>Your bonding curve is live.</h3>
      <div className="db-launch-receipt">
        <div><span>Pool</span><code>{pool}</code></div>
        <div><span>Token</span><code>{baseMint}</code></div>
        <div><span>Transaction</span><code>{signature}</code></div>
      </div>
      {s && <div className="db-dbc-progress"><span>Curve progress to graduation</span><div className="db-dbc-bar"><i style={{ width: `${s.curveProgressPct.toFixed(1)}%` }} /></div><small>{s.graduated ? 'Graduated to DAMM v2' : `${s.curveProgressPct.toFixed(1)}% toward DAMM v2 migration`}</small></div>}
      <div className="db-launch-actions">
        <a className="db-button db-blue-button" href={`https://solscan.io/token/${baseMint}`} target="_blank" rel="noreferrer">View token <ExternalLink size={16} /></a>
        <a className="db-text-link" href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">View receipt <ExternalLink size={15} /></a>
      </div>
    </div>
  );
}
