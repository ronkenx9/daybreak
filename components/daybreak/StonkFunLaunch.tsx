'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, ExternalLink, LoaderCircle, Rocket } from 'lucide-react';
import { useAccountState } from './AccountProvider';
import { StockIcon } from './Identity';
import { listPairs, prepareLaunch, submitLaunch, pollLaunch, feeStatus, prepareClaim, submitClaim, StonkFunError, type StonkPair } from '@/lib/stonkfun/client';
import { quoteSymbolFor } from '@/lib/stonkfun/pairs';

type Phase = 'idle' | 'preparing' | 'ready' | 'signing' | 'processing' | 'done';

async function urlToDataUrl(url: string): Promise<string | undefined> {
  if (!url) return undefined;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Could not read the artwork');
  const blob = await r.blob();
  if (!blob.type.startsWith('image/') || blob.size > 1_500_000) throw new Error('Artwork must be an image under 1.5 MB');
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

export default function StonkFunLaunch({ ticker, artUrl, initial }: { ticker: string; artUrl: string; initial: { name: string; symbol: string; description: string } }) {
  const account = useAccountState();
  const [name, setName] = useState(initial.name); const [symbol, setSymbol] = useState(initial.symbol); const [description, setDescription] = useState(initial.description);
  const [mode, setMode] = useState<'standard' | 'reward'>('standard'); const [tier2, setTier2] = useState(false); const [devBuy, setDevBuy] = useState('');
  const [pair, setPair] = useState<StonkPair | null>(null); const [pairError, setPairError] = useState('');
  const [phase, setPhase] = useState<Phase>('idle'); const [costSol, setCostSol] = useState(''); const [mint, setMint] = useState('');
  const [prepared, setPrepared] = useState<{ paymentTransaction: string; signedQuote: unknown; logo?: string } | null>(null);
  const [claimable, setClaimable] = useState(''); const [error, setError] = useState('');
  const quoteSymbol = quoteSymbolFor(ticker);
  useEffect(() => {
    let live = true;
    listPairs().then((pairs) => {
      if (!live) return;
      const found = pairs.find((p) => p.symbol === quoteSymbol) ?? null;
      if (found) setPair(found); else setPairError(`No StonkFun quote for ${ticker} right now`);
    }).catch(() => { if (live) setPairError('StonkFun pairs unavailable. Try again shortly.'); });
    return () => { live = false; };
  }, [quoteSymbol, ticker]);
  const valid = name.trim().length >= 2 && /^[A-Z0-9]{2,10}$/.test(symbol) && description.trim().length >= 10;
  async function prepare() {
    if (!account.authenticated) { account.login(); return; }
    setPhase('preparing'); setError(''); setMint('');
    try {
      const logo = await urlToDataUrl(artUrl).catch(() => undefined);
      const dev = devBuy.trim() ? Number(devBuy) : undefined;
      if (dev !== undefined && !(dev > 0)) throw new Error('Dev buy must be a positive SOL amount');
      // The quote binds to this wallet — resolve (creating if needed) BEFORE prepare.
      const creatorWallet = account.solanaWallet ?? await account.ensureSolanaWallet();
      const p = await prepareLaunch({
        creatorWallet,
        quoteMint: pair!.mint, name: name.trim(), symbol, mode,
        ...(mode === 'standard' && tier2 ? { feeTier: '2%' as const } : {}),
        ...(dev !== undefined ? { devBuySol: dev } : {}),
        ...(logo ? { logo } : {}),
      });
      const lamports = (p as { payment?: { lamports?: number } }).payment?.lamports;
      setCostSol(typeof lamports === 'number' ? `~${(lamports / 1e9).toFixed(4)} SOL` : 'see wallet');
      setPrepared({ paymentTransaction: p.paymentTransaction, signedQuote: p.signedQuote, logo });
      setPhase('ready');
    } catch (e) { setError(e instanceof Error ? e.message : 'Prepare failed'); setPhase('idle'); }
  }
  async function signAndLaunch() {
    if (!prepared || !pair) return;
    setPhase('signing'); setError('');
    try {
      const signedTransaction = await account.signSolanaTransaction(prepared.paymentTransaction);
      setPhase('processing');
      const submitted = await submitLaunch({ signedQuote: prepared.signedQuote, signedTransaction, logo: prepared.logo });
      const finalMint = submitted.status === 'completed' && submitted.mint ? submitted.mint : await pollLaunch(submitted.paymentSignature!);
      setMint(finalMint); setPhase('done');
      feeStatus(finalMint).then((f) => { if (f.claimable) setClaimable(`${f.claimable.quote.amountTokens} ${f.claimable.quote.symbol}`); }).catch(() => null);
    } catch (e) {
      // A `processing` submit means the launch is ON CHAIN — never pay again.
      // Anything else is safe to retry with a fresh prepare.
      setError(e instanceof StonkFunError && e.code === 'conflict' ? 'Payment landed and needs manual recovery — do not pay again.' : e instanceof Error ? e.message : 'Launch failed');
      setPhase(prepared ? 'ready' : 'idle');
    }
  }
  async function claim() {
    if (!mint || !account.solanaWallet) return;
    setError('');
    try {
      const q = await prepareClaim(mint, account.solanaWallet);
      const signedTransaction = await account.signSolanaTransaction(q.transaction);
      await submitClaim(mint, { creatorWallet: account.solanaWallet, intentId: q.intentId, signedTransaction });
      setClaimable('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Claim failed'); }
  }
  if (phase === 'done' && mint) return <section aria-live="polite">
    <div className="db-launch-success-mark"><Check size={34}/></div><span className="db-eyebrow">Live on Solana</span>
    <h2>{name} has launched.</h2><p>${symbol} now trades against {pair?.symbol} on StonkFun.</p>
    <div className="db-launch-receipt"><div><span>Mint</span><code>{mint}</code></div></div>
    <div className="db-launch-actions"><a className="db-button db-blue-button" href={`https://solscan.io/token/${mint}`} target="_blank" rel="noreferrer">View token <ExternalLink size={16}/></a></div>
    {claimable ? <button className="db-button" onClick={() => void claim()}>Claim fees · {claimable}</button> : null}
  </section>;
  return <div>
    <div className="db-launch-section-head"><span>S</span><div><h3>Solana via StonkFun.</h3><p>{pair ? <>Paired with {pair.symbol} · no API key, you sign everything.</> : pairError || 'Finding the stock quote…'}</p></div></div>
    {!account.solanaWallet && account.authenticated && <p className="db-small-note">A Solana wallet will be created for you on first sign — nothing to do.</p>}
    <div className="db-launch-fields two"><label><span>Token name</span><input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Everything Is Fine"/></label><label><span>Symbol</span><input required minLength={2} maxLength={10} value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="FINE"/></label></div>
    <div className="db-launch-fields"><label><span>What is it?</span><textarea required minLength={10} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="The community token for people watching the world burn beautifully."/></label></div>
    <div className="db-launch-fields two"><label><span>Fee mode</span><select value={mode} onChange={(e) => setMode(e.target.value as 'standard' | 'reward')}><option value="standard">Standard · you earn per-trade fees</option><option value="reward">Reward · holders earn transfer tax</option></select></label><label><span>Dev buy (SOL) <small>optional</small></span><input inputMode="decimal" value={devBuy} onChange={(e) => setDevBuy(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0"/></label></div>
    {mode === 'standard' && <label className="db-launch-check"><input type="checkbox" checked={tier2} onChange={(e) => setTier2(e.target.checked)}/><span><strong>2% fee tier</strong><small>You earn 1.5% per trade instead of 0.5%.</small></span></label>}
    {phase === 'idle' || phase === 'preparing' ? <button type="button" className="db-button db-blue-button db-launch-submit" disabled={!valid || !pair || phase === 'preparing'} onClick={() => void prepare()}>{phase === 'preparing' ? <><LoaderCircle className="db-spin" size={17}/> Preparing</> : <>Prepare launch <ArrowRight size={17}/></>}</button> : null}
    {phase === 'ready' && prepared ? <><div className="db-launch-ready"><StockIcon ticker={ticker} size={19}/><div><strong>Ready to sign.</strong><p>Cost {costSol} · paid with your Solana wallet. A processing launch is ON CHAIN — never pay twice.</p></div></div><button type="button" className="db-button db-blue-button db-launch-submit" onClick={() => void signAndLaunch()}><Rocket size={17}/> Sign &amp; launch</button></> : null}
    {phase === 'signing' || phase === 'processing' ? <p className="db-small-note">{phase === 'signing' ? 'Confirm in your Solana wallet…' : 'Opening the pool — this completes on its own even if you leave.'}</p> : null}
    {error && <p className="db-launch-error" role="alert">{error}</p>}
  </div>;
}
