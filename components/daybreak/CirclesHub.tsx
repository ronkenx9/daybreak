'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, LockKeyhole, Pin, Plus, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useAccount } from 'wagmi';
import { authedFetch } from '@/lib/account/api-client';
import { TOKENS } from '@/lib/base/tokens';
import { useAccountState } from './AccountProvider';
import { DAYBREAK_TOKEN, DAYC_PIN_PRICE, isPinSinkConfigured } from '@/lib/base/daybreak-token';
import { Avatar, ProfileAvatar } from './Identity';
import CircleDiscoveries from './CircleDiscoveries';
import CircleNews from './CircleNews';
import ConnectButton from './ConnectButton';

interface Circle {
  slug: string; name: string; description: string | null; kind: string; gateMode: string;
  tickers: string[]; memberCount: number; joined: boolean; eligible: boolean; owned: boolean; tokenAddress: string | null; pinned: boolean;
}
interface Member { displayName: string; handle: string | null; avatar: number; avatarUrl: string | null; role: string; verifiedTickers: string[] }

export default function CirclesHub() {
  const account = useAccountState();
  const { address, isConnected } = useAccount();
  // The Privy embedded wallet is linked to the account, so it can verify holdings
  // without connecting an external wallet. Prefer a connected external wallet.
  const embedded = account.authenticated ? account.user?.wallet ?? undefined : undefined;
  const verifyAddress = (isConnected ? address : undefined) ?? embedded;
  const [circles, setCircles] = useState<Circle[]>([]);
  const [activeSlug, setActiveSlug] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tickers, setTickers] = useState<string[]>([]);
  const [gateMode, setGateMode] = useState('any_stock');

  const load = async (prefer?: string) => {
    if (!account.authenticated) return;
    setLoading(true);
    try {
      const result = await authedFetch<{ circles: Circle[] }>('/api/circles');
      setCircles(result.circles);
      setActiveSlug((current) => prefer ?? (current || result.circles[0]?.slug || ''));
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Circles are unavailable'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [account.authenticated]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = circles.find((circle) => circle.slug === activeSlug) ?? circles[0];

  useEffect(() => {
    setMembers([]);
    if (!active?.joined) return;
    authedFetch<{ members: Member[] }>(`/api/circles/members?slug=${encodeURIComponent(active.slug)}`).then((result) => setMembers(result.members)).catch(() => setMembers([]));
  }, [active?.slug, active?.joined]);

  // Concept 3 — "happening now": the liveliest circles by real membership, so the
  // page leads with momentum and social proof instead of a flat directory.
  const trending = useMemo(() => [...circles].filter((c) => c.memberCount > 0).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.memberCount - a.memberCount).slice(0, 6), [circles]);
  const recommended = useMemo(() => circles.filter((circle) => circle.kind === 'stock' && circle.eligible), [circles]);
  const visible = useMemo(() => {
    const unlocked = new Set(recommended.map((circle) => circle.slug));
    return [...recommended, ...circles.filter((circle) => !unlocked.has(circle.slug) && (circle.kind !== 'stock' || circle.joined))];
  }, [circles, recommended]);

  const toggleJoin = async () => {
    if (!active) return;
    setWorking(true); setNotice('');
    try {
      await authedFetch(active.joined ? `/api/circles/membership?slug=${encodeURIComponent(active.slug)}` : '/api/circles/membership', active.joined ? { method: 'DELETE' } : { method: 'POST', body: JSON.stringify({ slug: active.slug }) });
      await load(active.slug);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Circle could not be updated'); }
    finally { setWorking(false); }
  };

  const sync = async () => {
    if (!verifyAddress) return;
    setWorking(true); setNotice('');
    try {
      const result = await authedFetch<{ eligibility: { tickers: string[] } }>('/api/holdings/sync', { method: 'POST', body: JSON.stringify({ address: verifyAddress }) });
      setNotice(result.eligibility.tickers.length ? `Unlocked from verified holdings: ${result.eligibility.tickers.join(', ')}.` : 'Wallet verified. No supported stock balances were found.');
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Holdings could not be verified';
      setNotice(message);
      if (message.toLowerCase().includes('link this wallet')) account.linkWallet();
    } finally { setWorking(false); }
  };

  const pin = async () => {
    if (!active) return;
    setWorking(true); setNotice('');
    try {
      const amountRaw = (BigInt(DAYC_PIN_PRICE) * 10n ** BigInt(DAYBREAK_TOKEN.decimals)).toString();
      const { hash, from } = await account.payDaycPin(amountRaw);
      setNotice('Payment sent — confirming your pin…');
      const res = await authedFetch<{ pinned: boolean; hours: number }>('/api/circles/pin', { method: 'POST', body: JSON.stringify({ slug: active.slug, txHash: hash, from }) });
      setNotice(`Pinned to the top for ${res.hours} hours.`);
      await load(active.slug);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Pin could not be completed');
    } finally { setWorking(false); }
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setWorking(true); setNotice('');
    try {
      const result = await authedFetch<{ slug: string }>('/api/circles', { method: 'POST', body: JSON.stringify({ name, description, tickers, gateMode }) });
      setName(''); setDescription(''); setTickers([]); setCreating(false); await load(result.slug); setNotice('Your circle is live.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Circle could not be created'); }
    finally { setWorking(false); }
  };

  if (!account.authenticated) return <section className="db-circle-auth db-glass"><span className="db-eyebrow">Your holding is the invitation</span><Users size={36}/><h2>Hold the stock. Find your people.</h2><p>Sign in, verify a wallet you own, and Daybreak will show the circles unlocked by your supported tokenized stocks.</p><button className="db-button db-blue-button" onClick={() => account.login()}>Find my circles</button></section>;

  return <>
    <section className="db-circle-proof db-glass">
      <div><span className="db-eyebrow">Private proof, social access</span><h2>Hold the stock. Unlock the room.</h2><p>Daybreak checks a wallet linked to your account and stores only short-lived eligibility—not balances. Other members never see your wallet or position size.</p></div>
      <div className="db-circle-proof-actions"><ConnectButton/>{verifyAddress && <button className="db-button db-blue-button" disabled={working} onClick={sync}><RefreshCw size={16}/>{working ? 'Verifying…' : isConnected ? 'Verify holdings' : 'Verify my Daybreak wallet'}</button>}</div>
    </section>
    {trending.length > 0 && <section className="db-happening" aria-label="Happening now">
      <div className="db-section-heading"><div><span className="db-eyebrow">🔥 Happening now</span><h2>Where people are gathering.</h2></div></div>
      <div className="db-happening-rail">{trending.map((circle, index) => <button key={circle.slug} className="db-happening-card" onClick={() => { setActiveSlug(circle.slug); document.querySelector('.db-disc-heading')?.scrollIntoView({ behavior: 'smooth' }); }}>
        <div className="db-happening-top"><Avatar seed={index % 6} size={40}/>{index === 0 && !circle.pinned && <span className="db-happening-hot">Most active</span>}{circle.pinned && <span className="db-happening-hot db-pinned"><Pin size={10}/> Pinned</span>}</div>
        <strong>{circle.name}</strong>
        <span className="db-happening-meta"><Users size={13}/> {circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}{circle.joined ? ' · you’re in' : ''}</span>
      </button>)}</div>
    </section>}
    <div className="db-section-heading"><div><span className="db-eyebrow">Circles</span><h2>{recommended.length ? `${recommended.length} unlocked for you.` : 'Community, built around conviction.'}</h2></div><button className="db-button db-blue-button" onClick={() => setCreating((value) => !value)}><Plus size={16}/> Create circle</button></div>
    {creating && <form className="db-circle-create db-glass" onSubmit={create}><label>Circle name<input required minLength={3} maxLength={48} value={name} onChange={(event) => setName(event.target.value)} placeholder="Alphabet builders"/></label><label>What is it about?<input maxLength={180} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="News, ideas and conversation"/></label><label>Access<select value={gateMode} onChange={(event) => setGateMode(event.target.value)}><option value="any_stock">Hold any selected stock</option><option value="all_stocks">Hold every selected stock</option><option value="open">Open to everyone</option></select></label><fieldset><legend>Stocks for the circle</legend><div className="db-circle-ticker-picker">{TOKENS.map((token) => <button type="button" key={token.ticker} aria-pressed={tickers.includes(token.ticker)} onClick={() => setTickers((current) => current.includes(token.ticker) ? current.filter((ticker) => ticker !== token.ticker) : current.length < 5 ? [...current, token.ticker] : current)}>{token.ticker}</button>)}</div></fieldset><button className="db-button db-blue-button" disabled={working || (gateMode !== 'open' && !tickers.length)}>Publish circle</button></form>}
    {notice && <p className="db-circle-notice" role="status">{notice}</p>}
    {loading ? <div className="db-empty"><p>Loading circles…</p></div> : <div className="db-group-grid">{visible.map((circle, index) => <button key={circle.slug} className={`db-group-card group-${index % 3} ${active?.slug === circle.slug ? 'selected' : ''}`} onClick={() => setActiveSlug(circle.slug)} aria-pressed={active?.slug === circle.slug}><Avatar seed={index % 6} size={64}/><span className={circle.pinned ? 'db-card-pinned' : undefined}>{circle.pinned ? <><Pin size={11}/> Pinned</> : circle.kind === 'stock' ? (circle.eligible ? 'Verified holding' : 'Stock circle') : circle.owned ? 'Created by you' : 'Community'}</span><h3>{circle.name}</h3><p>{circle.description}</p><div>{circle.tickers.map((ticker) => <span key={ticker}>{ticker}</span>)}<span>{circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}</span></div></button>)}</div>}
    {active && <>
      <div className="db-section-heading db-disc-heading"><div><span className="db-eyebrow">{active.name}</span><h2>{active.joined ? 'Inside the circle.' : active.eligible ? 'You have access.' : 'A holding is required.'}</h2></div><div className="db-circle-head-actions">{isPinSinkConfigured && (active.joined || active.owned) && <button className="db-button db-pin-button" disabled={working} onClick={() => void pin()} title={`Pin this circle to the top for ${DAYC_PIN_PRICE.toLocaleString()} DAYC`}><Pin size={15}/> {active.pinned ? 'Pinned' : `Pin · ${DAYC_PIN_PRICE.toLocaleString()} DAYC`}</button>}<button className="db-button db-blue-button" disabled={working || active.owned || (!active.joined && !active.eligible)} onClick={toggleJoin}>{active.owned ? <Check size={17}/> : active.joined ? <Check size={17}/> : active.eligible ? <Plus size={17}/> : <LockKeyhole size={17}/>} {active.owned ? 'Circle owner' : active.joined ? 'Leave circle' : active.eligible ? 'Join circle' : 'Locked'}</button></div></div>
      <CircleDiscoveries slug={active.slug} isMember={active.joined} onJoin={toggleJoin} tickers={active.tickers}/>
      {active.tokenAddress && <p className="db-circle-token"><strong>Live community token</strong><code>{active.tokenAddress.slice(0, 8)}…{active.tokenAddress.slice(-6)}</code><a href={`https://basescan.org/token/${active.tokenAddress}`} target="_blank" rel="noreferrer">View on BaseScan ↗</a></p>}
      {active.tickers.length > 0 && <CircleNews key={active.tickers.join(',')} tickers={active.tickers} title={`${active.name} · latest stories`}/>}
      <section className="db-circle-members"><div className="db-board-header"><div><span className="db-eyebrow">People</span><h2>{active.joined ? `${members.length} in this circle.` : 'Join to meet members.'}</h2><p>Joining is consent to show your Daybreak name, profile photo and verified stock badges inside this circle. Wallets and balances stay private.</p></div><ShieldCheck size={22}/></div>{active.joined && (members.length ? <div className="db-member-grid">{members.map((member, index) => <article key={`${member.displayName}-${index}`}><ProfileAvatar imageUrl={member.avatarUrl} seed={member.avatar} size={48}/><div><strong>{member.displayName}</strong><small>{member.handle || (member.role === 'owner' ? 'Circle creator' : 'Member')}</small><p>{member.verifiedTickers.map((ticker) => <span key={ticker}>{ticker} ✓</span>)}</p></div></article>)}</div> : <div className="db-empty"><Users size={28}/><h3>You’re the first one here.</h3><p>Share the circle with another holder to meet them here.</p></div>)}</section>
    </>}
  </>;
}
