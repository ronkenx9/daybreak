'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame, ExternalLink, Check, AlertTriangle, LockKeyhole } from 'lucide-react';
import { useAccountState } from './AccountProvider';

interface Holding { symbol: string; rawAmount: string }
interface Snap { holdings: Holding[] }
interface Build { transactionBase64: string; poolAddress: string; baseMint: string; name: string; symbol: string; referenceValuationUsd: number; band: { initialMarketCap: number; migrationMarketCap: number } }
interface PoolStatus { curveProgressPct: number; graduated: boolean }

const usd = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });

// Concept: a "belief market" for a pre-IPO name, built on Meteora DBC. Holder-gated —
// only wallets holding the PreStocks token can launch or trade it — and the curve's
// price band is anchored to the company's live implied valuation.
export default function ConvictionMarket({ symbol, company, externalUrl }: { symbol: string; company: string; externalUrl: string }) {
  const account = useAccountState();
  const address = account.solanaWallet || undefined;
  const [phase, setPhase] = useState<'idle' | 'building' | 'signing' | 'done'>('idle');
  const [build, setBuild] = useState<Build | null>(null);
  const [signature, setSignature] = useState('');
  const [error, setError] = useState('');

  // Holder gate: does this account's Solana wallet hold the pre-IPO token?
  const holds = useQuery({
    queryKey: ['prestock-holdings', address],
    enabled: !!address && account.authenticated,
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/prestocks/holdings?address=${address}`, { signal, cache: 'no-store' });
      if (!r.ok) throw new Error('unavailable');
      return r.json() as Promise<Snap>;
    },
    staleTime: 20_000, retry: 1,
  });
  const isHolder = !!holds.data?.holdings.some((h) => h.symbol === symbol && BigInt(h.rawAmount) > 0n);

  const launch = async () => {
    setError(''); setPhase('building'); setBuild(null); setSignature('');
    try {
      const r = await fetch('/api/solana/dbc/conviction', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ creator: address, symbol }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not build the belief market');
      setBuild(d as Build);
      setPhase('signing');
      const signed = await account.signSolanaTransaction((d as Build).transactionBase64);
      const s = await fetch('/api/solana/dbc/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signedTransaction: signed }) });
      const sd = await s.json();
      if (!s.ok) throw new Error(sd.error || 'Submit failed');
      setSignature(sd.signature); setPhase('done');
    } catch (e) { setError(e instanceof Error ? e.message : 'Launch failed'); setPhase('idle'); }
  };

  return (
    <section className="db-conviction" aria-label={`${company} belief market`}>
      <div className="db-section-heading"><div><span className="db-eyebrow"><Flame size={13} /> Belief market · DBC</span><h3>Back your conviction in {company}.</h3></div></div>
      <p className="db-small-note">A community token for {company} believers, launched on a Meteora bonding curve. Its price band is anchored to {company}’s live implied valuation, and it graduates to DAMM v2 liquidity. Holders of {symbol} only.</p>

      {phase === 'done' ? (
        <div className="db-conviction-done"><div className="db-launch-success-mark"><Check size={30} /></div><strong>Belief market is live.</strong>
          {build && <ConvictionProgress pool={build.poolAddress} />}
          {build && <div className="db-launch-actions"><a className="db-button db-blue-button" href={`https://solscan.io/token/${build.baseMint}`} target="_blank" rel="noreferrer">View token <ExternalLink size={15} /></a><a className="db-text-link" href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">Receipt <ExternalLink size={14} /></a></div>}
        </div>
      ) : !account.authenticated ? (
        <button className="db-button db-blue-button" onClick={() => account.login()}>Sign in to back {symbol}</button>
      ) : !address ? (
        <p className="db-small-note">Your Solana wallet is loading…</p>
      ) : !isHolder ? (
        <div className="db-conviction-gate"><LockKeyhole size={17} /><div><strong>Hold {symbol} to unlock its belief market.</strong><p>Only {company} holders can launch or trade this. Get {symbol} on PreStocks, then come back.</p></div><a className="db-button db-blue-button" href={externalUrl} target="_blank" rel="noopener noreferrer">Get {symbol} <ExternalLink size={15} /></a></div>
      ) : (
        <>
          <div className="db-conviction-gate is-open"><Check size={16} /><p>You hold {symbol} — you can launch its belief market.</p></div>
          <div className="db-dbc-gate"><AlertTriangle size={16} /><p>Launching creates the pool on Solana mainnet. Your Solana wallet pays the rent and signs — no funds move until you approve it.</p></div>
          <button className="db-button db-blue-button" disabled={phase !== 'idle'} onClick={launch}><Flame size={16} /> {phase === 'building' ? 'Building…' : phase === 'signing' ? 'Waiting for signature…' : `Launch ${company} belief market`}</button>
        </>
      )}
      {error && <p className="db-trade-error" role="alert">{error}</p>}
    </section>
  );
}

function ConvictionProgress({ pool }: { pool: string }) {
  const status = useQuery({
    queryKey: ['dbc-pool', pool], enabled: !!pool, refetchInterval: 15_000, retry: 2,
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/solana/dbc/pool?address=${pool}`, { signal });
      if (!r.ok) throw new Error('unavailable');
      return r.json() as Promise<PoolStatus>;
    },
  });
  const s = status.data;
  if (!s) return null;
  return <div className="db-dbc-progress"><span>Curve progress to graduation</span><div className="db-dbc-bar"><i style={{ width: `${s.curveProgressPct.toFixed(1)}%` }} /></div><small>{s.graduated ? 'Graduated to DAMM v2' : `${s.curveProgressPct.toFixed(1)}% toward DAMM v2`}</small></div>;
}
