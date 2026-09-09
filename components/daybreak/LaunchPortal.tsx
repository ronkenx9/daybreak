'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ExternalLink, LoaderCircle, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { authedFetch } from '@/lib/account/api-client';
import { TOKENS } from '@/lib/base/tokens';
import { useAccountState } from './AccountProvider';
import { StockIcon, TypeBadge } from './Identity';

interface Draft { tokenName: string; tokenSymbol: string; description: string; image: string; websiteUrl: string; tweetUrl: string; ticker: string; quoteOnlyFees: boolean }
interface Preview {
  simulated: true; idempotencyKey: string; fingerprint: string; tokenAddress: string; poolId: string;
  chain: 'base'; ticker: string; feeRecipient: string; supply: string; allocation: string; vesting: string;
  feeDistribution: Record<string, { bps: number }>;
}
interface Result { success: true; tokenAddress: string; poolId: string; txHash: string; chain: 'base'; ticker: string }

const initial: Draft = { tokenName: '', tokenSymbol: '', description: '', image: '', websiteUrl: '', tweetUrl: '', ticker: 'AAPL', quoteOnlyFees: true };
const compact = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;

export default function LaunchPortal() {
  const account = useAccountState();
  const [draft, setDraft] = useState(initial); const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null); const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState<'preview' | 'launch' | null>(null); const [error, setError] = useState('');
  useEffect(() => { const ticker = new URLSearchParams(window.location.search).get('stock')?.toUpperCase(); if (ticker && TOKENS.some((token) => token.ticker === ticker)) setDraft((value) => ({ ...value, ticker })); }, []);
  const stock = useMemo(() => TOKENS.find((token) => token.ticker === draft.ticker) ?? TOKENS[0], [draft.ticker]);
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => { setDraft((current) => ({ ...current, [key]: value })); setPreview(null); setConfirmed(false); setError(''); };
  const valid = draft.tokenName.trim().length >= 2 && /^[A-Z0-9]{2,10}$/.test(draft.tokenSymbol) && draft.description.trim().length >= 10;

  async function simulate() {
    setLoading('preview'); setError(''); setResult(null);
    try { setPreview(await authedFetch<Preview>('/api/token-launches/simulate', { method: 'POST', body: JSON.stringify(draft) })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Preview unavailable'); }
    finally { setLoading(null); }
  }
  async function launch() {
    if (!preview) return; setLoading('launch'); setError('');
    try { setResult(await authedFetch<Result>('/api/token-launches', { method: 'POST', body: JSON.stringify({ ...draft, idempotencyKey: preview.idempotencyKey, fingerprint: preview.fingerprint }) })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Launch could not be completed'); }
    finally { setLoading(null); }
  }

  if (result) return <section className="db-launch-success" aria-live="polite">
    <div className="db-launch-success-mark"><Check size={34}/></div><span className="db-eyebrow">Live on Base</span>
    <h2>{draft.tokenName} has launched.</h2><p>${draft.tokenSymbol} now has a Uniswap v4 pool paired with {stock.onchainSymbol}.</p>
    <div className="db-launch-receipt"><div><span>Token</span><code>{result.tokenAddress}</code></div><div><span>Transaction</span><code>{result.txHash}</code></div></div>
    <div className="db-launch-actions"><a className="db-button db-blue-button" href={`https://basescan.org/token/${result.tokenAddress}`} target="_blank" rel="noreferrer">View token <ExternalLink size={16}/></a><a className="db-text-link" href={`https://basescan.org/tx/${result.txHash}`} target="_blank" rel="noreferrer">View receipt <ExternalLink size={15}/></a></div>
  </section>;

  return <section className="db-launch-portal">
    <div className="db-launch-hero">
      <div><span className="db-overline"><Sparkles size={14}/> Daybreak × Bankr</span><h2>Make the meme.<br/>Pair the market.</h2><p>Create an independent community token and launch it directly against a tokenized stock on Base.</p></div>
      <div className="db-launch-orbit"><div className="db-launch-token">{draft.tokenSymbol ? `$${draft.tokenSymbol.slice(0, 5)}` : 'YOUR\nTOKEN'}</div><span>×</span><StockIcon ticker={stock.ticker} size={76}/></div>
    </div>

    <div className="db-launch-layout">
      <form className="db-launch-form" onSubmit={(event) => { event.preventDefault(); if (account.authenticated) void simulate(); else account.login(); }}>
        <div className="db-launch-section-head"><span>01</span><div><h3>Name the idea.</h3><p>Keep it immediate. People should understand the joke or community in one glance.</p></div></div>
        <div className="db-launch-fields two"><label><span>Token name</span><input required minLength={2} maxLength={100} value={draft.tokenName} onChange={(event) => update('tokenName', event.target.value)} placeholder="Everything Is Fine"/></label><label><span>Symbol</span><input required minLength={2} maxLength={10} value={draft.tokenSymbol} onChange={(event) => update('tokenSymbol', event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="FINE"/></label></div>
        <div className="db-launch-fields"><label><span>What is it?</span><textarea required minLength={10} maxLength={500} value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="The community token for people watching the world burn beautifully."/></label></div>
        <div className="db-launch-fields two"><label><span>Artwork URL <small>optional</small></span><input type="url" value={draft.image} onChange={(event) => update('image', event.target.value)} placeholder="https://…"/></label><label><span>Project website <small>optional</small></span><input type="url" value={draft.websiteUrl} onChange={(event) => update('websiteUrl', event.target.value)} placeholder="https://…"/></label></div>

        <div className="db-launch-section-head"><span>02</span><div><h3>Choose its market.</h3><p>The token trades against the stock you select, rather than only ETH or USDC.</p></div></div>
        <fieldset className="db-launch-stocks"><legend className="sr-only">Stock pair</legend>{TOKENS.map((token) => <button type="button" key={token.ticker} aria-pressed={draft.ticker === token.ticker} onClick={() => update('ticker', token.ticker)}><StockIcon ticker={token.ticker} size={34}/><span><strong>{token.ticker}</strong><small>{token.onchainSymbol}</small></span>{draft.ticker === token.ticker && <Check size={15}/>}</button>)}</fieldset>

        <label className="db-launch-check"><input type="checkbox" checked={draft.quoteOnlyFees} onChange={(event) => update('quoteOnlyFees', event.target.checked)}/><span><strong>Collect creator fees in {stock.onchainSymbol}</strong><small>Keep the creator share in the stock side of the market.</small></span></label>
        {!account.authenticated ? <button type="submit" className="db-button db-blue-button db-launch-submit">Sign in to create <ArrowRight size={17}/></button> : <button type="submit" className="db-button db-blue-button db-launch-submit" disabled={!valid || loading !== null}>{loading === 'preview' ? <><LoaderCircle className="db-spin" size={17}/> Building preview</> : <>Preview launch <ArrowRight size={17}/></>}</button>}
        {error && <p className="db-launch-error" role="alert">{error}</p>}
      </form>

      <aside className="db-launch-review" aria-label="Launch review">
        <span className="db-eyebrow">03 · Review and launch</span><div className="db-launch-pair"><div className="db-launch-token small">{draft.tokenSymbol ? `$${draft.tokenSymbol.slice(0, 5)}` : '$—'}</div><ArrowRight size={17}/><StockIcon ticker={stock.ticker} size={48}/><div><strong>{draft.tokenName || 'Your token'}</strong><small>paired with {stock.onchainSymbol} · Base</small></div></div>
        <dl><div><dt>Supply</dt><dd>{preview?.supply ?? '100B'}</dd></div><div><dt>Allocation</dt><dd>{preview?.allocation ?? '85% pool · 15% vested'}</dd></div><div><dt>Creator vesting</dt><dd>{preview?.vesting ?? '1 year · 30-day cliff'}</dd></div><div><dt>Pool</dt><dd>Uniswap v4</dd></div><div><dt>Creator fee share</dt><dd>{preview?.feeDistribution.creator ? `${preview.feeDistribution.creator.bps / 100}% of pool fees` : 'Shown after preview'}</dd></div></dl>
        {preview ? <><div className="db-launch-ready"><ShieldCheck size={19}/><div><strong>Simulation passed.</strong><p>No token has been deployed yet. Predicted address: <code>{compact(preview.tokenAddress)}</code></p></div></div><label className="db-launch-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/><span>I understand this creates a public, tradable token and cannot be undone.</span></label><button className="db-button db-blue-button" disabled={!confirmed || loading !== null} onClick={() => void launch()}>{loading === 'launch' ? <><LoaderCircle className="db-spin" size={17}/> Launching on Base</> : <><Rocket size={17}/> Launch token</>}</button></> : <div className="db-launch-wait"><Rocket size={22}/><p>Complete the details and preview the launch. Bankr will simulate the exact pool and fee recipients before anything goes live.</p></div>}
        <p className="db-small-note"><TypeBadge kind="community"/> Independent community token. It is not equity, company-issued, or company-endorsed.</p>
      </aside>
    </div>
  </section>;
}
