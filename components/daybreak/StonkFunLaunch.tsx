'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, ExternalLink, LoaderCircle, Rocket } from 'lucide-react';
import { useAccountState } from './AccountProvider';
import { StockIcon } from './Identity';
import { listPairs, prepareLaunch, submitLaunch, pollLaunch, feeStatus, prepareClaim, submitClaim, signedTransactionSignature, type StonkPair } from '@/lib/stonkfun/client';
import { quoteSymbolFor } from '@/lib/stonkfun/pairs';

type Phase = 'idle' | 'preparing' | 'ready' | 'signing' | 'processing' | 'done' | 'unknown';
interface StonkOp {
  state: 'submitted' | 'processing' | 'unknown' | 'done';
  paymentSignature?: string; mint?: string;
  name: string; symbol: string; quoteMint: string; quoteSymbol: string;
  mode: string; feeTier?: string; devBuySol?: number; creatorWallet: string; updatedAt: number;
}
const opKey = (userId: string) => `daybreak-stonkfun-op:${userId}`;
const loadOp = (key: string): StonkOp | null => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as StonkOp : null; } catch { return null; } };
const saveOp = (key: string, op: StonkOp | null) => { try { if (op) localStorage.setItem(key, JSON.stringify(op)); else localStorage.removeItem(key); } catch { /* private mode */ } };
const byteLen = (s: string) => new TextEncoder().encode(s).length;

async function urlToDataUrl(url: string): Promise<string> {
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

function fileToDataUrl(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1_500_000) return Promise.reject(new Error('Logo must be PNG/JPG/WebP under 1.5 MB'));
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

export default function StonkFunLaunch({ ticker, artUrl, initial }: { ticker: string; artUrl: string; initial: { name: string; symbol: string; description: string } }) {
  const account = useAccountState();
  const [name, setName] = useState(initial.name); const [symbol, setSymbol] = useState(initial.symbol); const [website, setWebsite] = useState('');
  const [mode, setMode] = useState<'standard' | 'reward'>('standard'); const [tier2, setTier2] = useState(false); const [devBuy, setDevBuy] = useState('');
  const [pair, setPair] = useState<StonkPair | null>(null); const [pairError, setPairError] = useState('');
  const [phase, setPhase] = useState<Phase>('idle'); const [costSol, setCostSol] = useState(''); const [mint, setMint] = useState('');
  const [prepared, setPrepared] = useState<{ paymentTransaction: string; signedQuote: unknown; logo: string; intent: Omit<StonkOp, 'state' | 'paymentSignature' | 'mint' | 'updatedAt'> } | null>(null);
  const [logoState, setLogoState] = useState<'none' | 'attached' | 'failed'>('none');
  const [pickedLogo, setPickedLogo] = useState<string | null>(null);
  const [op, setOp] = useState<StonkOp | null>(null);
  const [claimable, setClaimable] = useState(''); const [error, setError] = useState('');
  const quoteSymbol = quoteSymbolFor(ticker);
  const operationKey = account.user ? opKey(account.user.id) : null;
  const locked = phase !== 'idle' && phase !== 'done';
  useEffect(() => {
    let live = true;
    listPairs().then((pairs) => {
      if (!live) return;
      const found = pairs.find((p) => p.symbol === quoteSymbol) ?? null;
      if (found) setPair(found); else setPairError(`No StonkFun quote for ${ticker} right now`);
    }).catch(() => { if (live) setPairError('StonkFun pairs unavailable. Try again shortly.'); });
    return () => { live = false; };
  }, [quoteSymbol, ticker]);
  useEffect(() => {
    if (!operationKey) return;
    const saved = loadOp(operationKey);
    if (saved) void reconcile(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operationKey]);
  async function reconcile(saved: StonkOp) {
    if (!operationKey || !saved.paymentSignature) return;
    setOp(saved);
    try {
      const mintNow = await pollLaunch(saved.paymentSignature, undefined, 60_000);
      const done: StonkOp = { ...saved, state: 'done', mint: mintNow, updatedAt: Date.now() };
      setOp(done); saveOp(operationKey, done); setMint(mintNow); setPhase('done');
      feeStatus(mintNow).then((f) => { if (f.claimable) setClaimable(`${f.claimable.quote.amountTokens} ${f.claimable.quote.symbol}`); }).catch(() => null);
    } catch {
      const unknown: StonkOp = { ...saved, state: 'unknown', updatedAt: Date.now() };
      setOp(unknown); saveOp(operationKey, unknown); setPhase('unknown');
      setError('Launch status unknown — it may be on chain. Check before starting anything new.');
    }
  }
  const nameOk = byteLen(name.trim()) >= 1 && byteLen(name.trim()) <= 32;
  const symbolOk = /^[A-Z0-9]{1,10}$/.test(symbol) && byteLen(symbol) <= 10;
  const valid = nameOk && symbolOk;
  async function prepare() {
    if (!account.authenticated) { account.login(); return; }
    setPhase('preparing'); setError(''); setMint(''); setPrepared(null);
    try {
      const creatorWallet = account.solanaWallet ?? await account.ensureSolanaWallet();
      let logo: string | undefined;
      try {
        if (pickedLogo) logo = pickedLogo;
        else if (artUrl) logo = await urlToDataUrl(artUrl);
        if (!logo) throw new Error('no logo');
        setLogoState('attached');
      } catch {
        setLogoState('failed');
        throw new Error('A logo is required by StonkFun and none is available — attach one below.');
      }
      const dev = devBuy.trim() ? Number(devBuy) : undefined;
      if (dev !== undefined && !(dev > 0)) throw new Error('Dev buy must be a positive SOL amount');
      const p = await prepareLaunch({
        creatorWallet, quoteMint: pair!.mint, name: name.trim(), symbol, logo, mode,
        ...(mode === 'standard' && tier2 ? { feeTier: '2%' as const } : {}),
        ...(dev !== undefined ? { devBuySol: dev } : {}),
      });
      const lamports = (p as { payment?: { lamports?: number } }).payment?.lamports;
      setCostSol(typeof lamports === 'number' ? `~${(lamports / 1e9).toFixed(4)} SOL` : 'see wallet');
      setPrepared({ paymentTransaction: p.paymentTransaction, signedQuote: p.signedQuote, logo, intent: { name: name.trim(), symbol, quoteMint: pair!.mint, quoteSymbol: pair!.symbol, mode, ...(mode==='standard'&&tier2?{feeTier:'2%'}:{}), ...(dev!==undefined?{devBuySol:dev}:{}), creatorWallet } });
      setPhase('ready');
    } catch (e) { setError(e instanceof Error ? e.message : 'Prepare failed'); setPhase('idle'); }
  }
  async function signAndLaunch() {
    if (!prepared || !operationKey) return;
    setPhase('signing'); setError('');
    try {
      if (account.solanaWallet !== prepared.intent.creatorWallet) {
        throw new Error('The connected Solana wallet changed. Review the launch again before signing.');
      }
      const signedTransaction = await account.signSolanaTransaction(prepared.paymentTransaction);
      const paymentSignature = signedTransactionSignature(signedTransaction);
      const submittedOp: StonkOp = { ...prepared.intent, state: 'submitted', paymentSignature, updatedAt: Date.now() };
      setOp(submittedOp); saveOp(operationKey, submittedOp);
      setPhase('processing');
      const submitted = await submitLaunch({ signedQuote: prepared.signedQuote, signedTransaction, logo: prepared.logo });
      if (submitted.paymentSignature && submitted.paymentSignature !== paymentSignature) throw new Error('Launch service returned a different payment signature');
      const opBase = { ...prepared.intent, updatedAt: Date.now() };
      if (submitted.status === 'completed' && submitted.mint) {
        const done: StonkOp = { ...opBase, state: 'done', mint: submitted.mint, paymentSignature };
        setOp(done); saveOp(operationKey, done); setMint(submitted.mint); setPhase('done');
        feeStatus(submitted.mint).then((f) => { if (f.claimable) setClaimable(`${f.claimable.quote.amountTokens} ${f.claimable.quote.symbol}`); }).catch(() => null);
        return;
      }
      const processing: StonkOp = { ...opBase, state: 'processing', paymentSignature };
      setOp(processing); saveOp(operationKey, processing);
      const finalMint = await pollLaunch(paymentSignature);
      const done: StonkOp = { ...opBase, state: 'done', mint: finalMint, paymentSignature };
      setOp(done); saveOp(operationKey, done); setMint(finalMint); setPhase('done');
      feeStatus(finalMint).then((f) => { if (f.claimable) setClaimable(`${f.claimable.quote.amountTokens} ${f.claimable.quote.symbol}`); }).catch(() => null);
    } catch (e) {
      const saved = operationKey ? loadOp(operationKey) : null;
      if (saved?.paymentSignature) {
        const u: StonkOp = { ...saved, state: 'unknown', updatedAt: Date.now() };
        setOp(u); saveOp(operationKey!, u); setPhase('unknown');
        setError('Submit status unknown — the launch may be on chain. Check status before doing anything new.');
        return;
      }
      // Wallet rejection happened before a signed transaction existed.
      setError(e instanceof Error ? e.message : 'Launch failed');
      setPhase('ready');
    }
  }
  async function checkOp() {
    const cur = operationKey ? loadOp(operationKey) : null;
    if (cur) void reconcile({ ...cur, state: cur.state === 'done' ? 'done' : 'processing' });
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
    <h2>{op?.name ?? name} has launched.</h2><p>${op?.symbol ?? symbol} now trades against {op?.quoteSymbol ?? pair?.symbol} on StonkFun.</p>
    <div className="db-launch-receipt"><div><span>Mint</span><code>{mint}</code></div></div>
    <div className="db-launch-actions"><a className="db-button db-blue-button" href={`https://solscan.io/token/${mint}`} target="_blank" rel="noreferrer">View token <ExternalLink size={16}/></a></div>
    {claimable ? <button className="db-button" onClick={() => void claim()}>Claim fees · {claimable}</button> : null}
  </section>;
  const blocked = op && op.state !== 'done';
  return <div>
    <div className="db-launch-section-head"><span>S</span><div><h3>Solana via StonkFun.</h3><p>{pair ? <>Paired with {pair.symbol} · no API key, you sign everything.</> : pairError || 'Finding the stock quote…'}</p></div></div>
    {!account.solanaWallet && account.authenticated && <p className="db-small-note">A Solana wallet will be created for you on first sign — nothing to do.</p>}
    {blocked ? <><div className="db-launch-ready"><StockIcon ticker={ticker} size={19}/><div><strong>Unresolved launch: {op.name} (${op.symbol}).</strong><p>State: {op.state}. Check its status before starting anything new — never pay twice.</p></div></div><button type="button" className="db-button db-blue-button db-launch-submit" onClick={() => void checkOp()}>Check status</button></> : null}
    <div className="db-launch-fields two"><label><span>Token name (≤32 bytes)</span><input required minLength={1} maxLength={64} value={name} disabled={locked} onChange={(e) => setName(e.target.value)} placeholder="Everything Is Fine"/></label><label><span>Symbol (≤10)</span><input required minLength={1} maxLength={10} value={symbol} disabled={locked} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="FINE"/></label></div>
    {!nameOk && name ? <p className="db-launch-error" role="alert">Name must fit 32 bytes.</p> : null}
    {!symbolOk && symbol ? <p className="db-launch-error" role="alert">Symbol: A–Z, 0–9, max 10 bytes.</p> : null}
    <div className="db-launch-fields two"><label><span>Fee mode</span><select value={mode} disabled={locked} onChange={(e) => setMode(e.target.value as 'standard' | 'reward')}><option value="standard">Standard · you earn per-trade fees</option><option value="reward">Reward · holders earn transfer tax</option></select></label><label><span>Dev buy (SOL) <small>optional</small></span><input inputMode="decimal" value={devBuy} disabled={locked} onChange={(e) => setDevBuy(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0"/></label></div>
    {mode === 'standard' && <label className="db-launch-check"><input type="checkbox" checked={tier2} disabled={locked} onChange={(e) => setTier2(e.target.checked)}/><span><strong>2% fee tier</strong><small>You earn 1.5% per trade instead of 0.5%.</small></span></label>}
    <label className="db-launch-check"><span><strong>Logo</strong><small>{logoState === 'attached' ? 'Muse artwork attached.' : logoState === 'failed' ? 'Artwork unreadable — attach a file to continue.' : artUrl ? 'Reading artwork…' : 'No artwork — attach a PNG/JPG/WebP file (required).'}</small></span>{(!artUrl || logoState === 'failed') && <input type="file" accept="image/png,image/jpeg,image/webp" disabled={locked} onChange={(e) => { const f = e.target.files?.[0]; if (f) void fileToDataUrl(f).then((d) => { setPickedLogo(d); setLogoState('attached'); setError(''); }).catch((err) => { setLogoState('failed'); setError(err instanceof Error ? err.message : 'Bad file'); }); }}/>}</label>
    {phase === 'idle' || phase === 'preparing' ? <button type="button" className="db-button db-blue-button db-launch-submit" disabled={!valid || !pair || phase === 'preparing' || !!blocked} onClick={() => void prepare()}>{phase === 'preparing' ? <><LoaderCircle className="db-spin" size={17}/> Preparing</> : <>Prepare launch <ArrowRight size={17}/></>}</button> : null}
    {phase === 'ready' && prepared ? <><div className="db-launch-ready"><StockIcon ticker={ticker} size={19}/><div><strong>Review — this is exactly what you sign.</strong><p>{prepared.intent.name} (${prepared.intent.symbol}) · {prepared.intent.mode}{prepared.intent.feeTier ? ` · ${prepared.intent.feeTier} tier` : ''} · vs {prepared.intent.quoteSymbol} · creator {prepared.intent.creatorWallet.slice(0, 6)}…{prepared.intent.creatorWallet.slice(-4)} · cost {costSol}{prepared.intent.devBuySol ? ` · dev buy ${prepared.intent.devBuySol} SOL` : ''} · logo attached.</p></div></div><button type="button" className="db-button db-blue-button db-launch-submit" onClick={() => void signAndLaunch()}><Rocket size={17}/> Sign &amp; launch</button></> : null}
    {phase === 'signing' || phase === 'processing' ? <p className="db-small-note">{phase === 'signing' ? 'Confirm in your Solana wallet…' : 'Opening the pool — this completes on its own even if you leave.'}</p> : null}
    {phase === 'unknown' ? <><p className="db-launch-error" role="alert">Status unknown. The launch may be on chain — check before doing anything new.</p><button type="button" className="db-button" onClick={() => void checkOp()}>Check status</button></> : null}
    {error && <p className="db-launch-error" role="alert">{error}</p>}
  </div>;
}
