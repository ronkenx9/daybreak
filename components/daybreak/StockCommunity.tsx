'use client';
import { useEffect, useState } from 'react';
import { Users, Plus, Check, LockKeyhole, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAccount } from 'wagmi';
import { authedFetch } from '@/lib/account/api-client';
import { useAccountState } from './AccountProvider';
import CircleDiscoveries from './CircleDiscoveries';

interface Circle {
  slug: string; name: string; description: string | null; kind: string; gateMode: string;
  tickers: string[]; memberCount: number; joined: boolean; eligible: boolean; owned: boolean; tokenAddress: string | null; pinned: boolean;
}

// Concept 2: the community lives INSIDE the stock. Opening a stock shows its Circle
// (holders-<ticker>) right here — chat, members, join — so discovery and community are
// one motion, never a separate empty directory to go hunting through.
export default function StockCommunity({ ticker, company }: { ticker: string; company: string }) {
  const account = useAccountState();
  const { address, isConnected } = useAccount();
  const embedded = account.authenticated ? account.user?.wallet ?? undefined : undefined;
  const verifyAddress = (isConnected ? address : undefined) ?? embedded;
  const slug = `holders-${ticker.toLowerCase()}`;
  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (!account.authenticated) { setLoading(false); return; }
    setLoading(true);
    try {
      const result = await authedFetch<{ circles: Circle[] }>('/api/circles');
      setCircle(result.circles.find((c) => c.slug === slug) ?? null);
    } catch { setCircle(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [account.authenticated, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const join = async () => {
    if (!circle) return;
    setWorking(true); setNotice('');
    try {
      await authedFetch(circle.joined ? `/api/circles/membership?slug=${encodeURIComponent(slug)}` : '/api/circles/membership', circle.joined ? { method: 'DELETE' } : { method: 'POST', body: JSON.stringify({ slug }) });
      await load();
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not update circle'); }
    finally { setWorking(false); }
  };

  const verify = async () => {
    if (!verifyAddress) return;
    setWorking(true); setNotice('');
    try {
      const r = await authedFetch<{ eligibility: { tickers: string[] } }>('/api/holdings/sync', { method: 'POST', body: JSON.stringify({ address: verifyAddress }) });
      setNotice(r.eligibility.tickers.includes(ticker) ? `Verified — ${ticker} unlocked.` : 'Wallet verified. No supported balance found for this stock.');
      await load();
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Holdings could not be verified';
      setNotice(m); if (m.toLowerCase().includes('link this wallet')) account.linkWallet();
    } finally { setWorking(false); }
  };

  if (!account.authenticated) return (
    <section className="db-stock-community db-community-gate">
      <Users size={34} />
      <h3>{company} has a community.</h3>
      <p>Sign in to join the {ticker} circle — talk with other holders, share the moment, and follow the story together.</p>
      <button className="db-button db-blue-button" onClick={() => account.login()}>Sign in to join</button>
    </section>
  );

  if (loading) return <section className="db-stock-community"><p className="db-small-note">Loading the {ticker} circle…</p></section>;
  if (!circle) return <section className="db-stock-community"><p className="db-small-note">The {ticker} circle isn’t available right now.</p></section>;

  return (
    <section className="db-stock-community">
      <div className="db-community-head">
        <div>
          <span className="db-eyebrow">Circle · {ticker}</span>
          <h3>{circle.joined ? `You're in — ${circle.memberCount} ${circle.memberCount === 1 ? 'member' : 'members'}.` : circle.eligible ? 'You have access.' : 'Holders only.'}</h3>
          <p className="db-small-note">{circle.joined ? 'Chat with other holders below.' : circle.eligible ? `Join to talk with ${ticker} holders.` : `Hold ${ticker} on Base to unlock the chat. Balances stay private.`}</p>
        </div>
        <button className="db-button db-blue-button" disabled={working || circle.owned || (!circle.joined && !circle.eligible)} onClick={join}>
          {circle.owned ? <Check size={17} /> : circle.joined ? <Check size={17} /> : circle.eligible ? <Plus size={17} /> : <LockKeyhole size={17} />}
          {circle.owned ? 'Owner' : circle.joined ? 'Joined' : circle.eligible ? 'Join circle' : 'Locked'}
        </button>
      </div>

      {!circle.joined && !circle.eligible && verifyAddress && (
        <div className="db-community-verify">
          <ShieldCheck size={18} />
          <p>Already hold {ticker}? Verify your wallet to unlock. Daybreak stores only short-lived eligibility, never your balance.</p>
          <button className="db-button db-blue-button" disabled={working} onClick={verify}><RefreshCw size={15} />{working ? 'Verifying…' : isConnected ? 'Verify holdings' : 'Verify my wallet'}</button>
        </div>
      )}
      {notice && <p className="db-circle-notice" role="status">{notice}</p>}

      <CircleDiscoveries slug={slug} isMember={circle.joined} onJoin={join} tickers={circle.tickers.length ? circle.tickers : [ticker]} />
    </section>
  );
}
