'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, LockKeyhole, Plus, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useAccount } from 'wagmi';
import { authedFetch } from '@/lib/account/api-client';
import { TOKENS } from '@/lib/base/tokens';
import { useAccountState } from './AccountProvider';
import { Avatar } from './Identity';
import CircleDiscoveries from './CircleDiscoveries';
import CircleNews from './CircleNews';
import ConnectButton from './ConnectButton';

interface Circle {
  slug: string; name: string; description: string | null; kind: string; gateMode: string;
  tickers: string[]; memberCount: number; joined: boolean; eligible: boolean; owned: boolean; tokenAddress: string | null;
}
interface Member { displayName: string; handle: string | null; avatar: number; role: string; verifiedTickers: string[] }

export default function CirclesHub() {
  const account = useAccountState();
  const { address, isConnected } = useAccount();
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
    if (!address) return;
    setWorking(true); setNotice('');
    try {
      const result = await authedFetch<{ eligibility: { tickers: string[] } }>('/api/holdings/sync', { method: 'POST', body: JSON.stringify({ address }) });
      setNotice(result.eligibility.tickers.length ? `Unlocked from verified holdings: ${result.eligibility.tickers.join(', ')}.` : 'Wallet verified. No supported stock balances were found.');
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Holdings could not be verified';
      setNotice(message);
      if (message.toLowerCase().includes('link this wallet')) account.linkWallet();
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

  if (!account.authenticated) return <section className="db-circle-auth db-glass"><Users size={36}/><h2>Sign in to find your people.</h2><p>Connect a Daybreak account, verify a wallet you own, and unlock circles for the supported stocks in it.</p><button className="db-button db-blue-button" onClick={() => account.login()}>Sign in</button></section>;

  return <>
    <section className="db-circle-proof db-glass">
      <div><span className="db-eyebrow">Private proof, social access</span><h2>Hold the stock. Unlock the room.</h2><p>Daybreak checks a wallet linked to your account and stores only short-lived eligibility—not balances. Other members never see your wallet or position size.</p></div>
      <div className="db-circle-proof-actions"><ConnectButton/>{isConnected && <button className="db-button db-blue-button" disabled={working} onClick={sync}><RefreshCw size={16}/>{working ? 'Verifying…' : 'Verify holdings'}</button>}</div>
    </section>
    <div className="db-section-heading"><div><span className="db-eyebrow">Circles</span><h2>{recommended.length ? `${recommended.length} unlocked for you.` : 'Community, built around conviction.'}</h2></div><button className="db-button db-blue-button" onClick={() => setCreating((value) => !value)}><Plus size={16}/> Create circle</button></div>
    {creating && <form className="db-circle-create db-glass" onSubmit={create}><label>Circle name<input required minLength={3} maxLength={48} value={name} onChange={(event) => setName(event.target.value)} placeholder="Alphabet builders"/></label><label>What is it about?<input maxLength={180} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="News, ideas and conversation"/></label><label>Access<select value={gateMode} onChange={(event) => setGateMode(event.target.value)}><option value="any_stock">Hold any selected stock</option><option value="all_stocks">Hold every selected stock</option><option value="open">Open to everyone</option></select></label><fieldset><legend>Stocks for the circle</legend><div className="db-circle-ticker-picker">{TOKENS.map((token) => <button type="button" key={token.ticker} aria-pressed={tickers.includes(token.ticker)} onClick={() => setTickers((current) => current.includes(token.ticker) ? current.filter((ticker) => ticker !== token.ticker) : current.length < 5 ? [...current, token.ticker] : current)}>{token.ticker}</button>)}</div></fieldset><button className="db-button db-blue-button" disabled={working || (gateMode !== 'open' && !tickers.length)}>Publish circle</button></form>}
    {notice && <p className="db-circle-notice" role="status">{notice}</p>}
    {loading ? <div className="db-empty"><p>Loading circles…</p></div> : <div className="db-group-grid">{visible.map((circle, index) => <button key={circle.slug} className={`db-group-card group-${index % 3} ${active?.slug === circle.slug ? 'selected' : ''}`} onClick={() => setActiveSlug(circle.slug)} aria-pressed={active?.slug === circle.slug}><Avatar seed={index % 6} size={64}/><span>{circle.kind === 'stock' ? (circle.eligible ? 'Verified holding' : 'Stock circle') : circle.owned ? 'Created by you' : 'Community'}</span><h3>{circle.name}</h3><p>{circle.description}</p><div>{circle.tickers.map((ticker) => <span key={ticker}>{ticker}</span>)}<span>{circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}</span></div></button>)}</div>}
    {active && <>
      <div className="db-section-heading db-disc-heading"><div><span className="db-eyebrow">{active.name}</span><h2>{active.joined ? 'Inside the circle.' : active.eligible ? 'You have access.' : 'A holding is required.'}</h2></div><button className="db-button db-blue-button" disabled={working || active.owned || (!active.joined && !active.eligible)} onClick={toggleJoin}>{active.owned ? <Check size={17}/> : active.joined ? <Check size={17}/> : active.eligible ? <Plus size={17}/> : <LockKeyhole size={17}/>} {active.owned ? 'Circle owner' : active.joined ? 'Leave circle' : active.eligible ? 'Join circle' : 'Locked'}</button></div>
      <CircleDiscoveries slug={active.slug} isMember={active.joined} onJoin={toggleJoin} tickers={active.tickers}/>
      {active.tokenAddress && <p className="db-circle-token"><strong>Live community token</strong><code>{active.tokenAddress.slice(0, 8)}…{active.tokenAddress.slice(-6)}</code><a href={`https://basescan.org/token/${active.tokenAddress}`} target="_blank" rel="noreferrer">View on BaseScan ↗</a></p>}
      {active.tickers.length > 0 && <CircleNews key={active.tickers.join(',')} tickers={active.tickers} title={`${active.name} · latest stories`}/>}
      <section className="db-circle-members"><div className="db-board-header"><div><span className="db-eyebrow">People</span><h2>{active.joined ? `${members.length} in this circle.` : 'Join to meet members.'}</h2><p>Joining is consent to show your Daybreak name and verified stock badges inside this circle. Wallets and balances stay private.</p></div><ShieldCheck size={22}/></div>{active.joined && <div className="db-member-grid">{members.map((member, index) => <article key={`${member.displayName}-${index}`}><Avatar seed={member.avatar} size={48}/><div><strong>{member.displayName}</strong><small>{member.handle || (member.role === 'owner' ? 'Circle creator' : 'Member')}</small><p>{member.verifiedTickers.map((ticker) => <span key={ticker}>{ticker} ✓</span>)}</p></div></article>)}</div>}</section>
    </>}
  </>;
}
