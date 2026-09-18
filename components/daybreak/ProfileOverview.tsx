'use client';

import { ChevronRight, Pencil, ShieldCheck, WalletCards } from 'lucide-react';
import { portfolio, positionUsdAtoms, usd, type HoldingsSnapshot } from '@/lib/base/model';
import { ProfileAvatar, StockIcon } from './Identity';

interface ProfileOverviewProps {
  avatarUrl: string | null;
  avatar: number;
  nickname: string;
  syncLabel: string;
  connected: boolean;
  snapshot?: HoldingsSnapshot;
  loading: boolean;
  error: boolean;
  onEdit: () => void;
  onViewHoldings: () => void;
  holdingsExpanded: boolean;
}

export default function ProfileOverview({
  avatarUrl,
  avatar,
  nickname,
  syncLabel,
  connected,
  snapshot,
  loading,
  error,
  onEdit,
  onViewHoldings,
  holdingsExpanded,
}: ProfileOverviewProps) {
  const totals = snapshot ? portfolio(snapshot.holdings, snapshot.prices) : null;
  const complete = snapshot?.status === 'complete' && totals?.missing === 0;
  const balance = !connected
    ? '—'
    : loading && !snapshot
      ? 'Reading balance…'
      : error && !snapshot
        ? 'Unavailable'
        : totals && ((snapshot?.holdings.length === 0 && complete) || totals.priced > 0)
          ? usd(totals.total)
          : 'Unavailable';
  const holdings = snapshot?.holdings.slice(0,4) ?? [];
  const balanceNote = !connected
    ? 'Connect through Sign in to view supported holdings'
    : error
      ? 'Previous values may be shown'
      : snapshot?.status === 'partial'
        ? 'Priced subtotal · coverage is incomplete'
        : snapshot
          ? `Updated from Base · ${snapshot.holdings.length} ${snapshot.holdings.length === 1 ? 'holding' : 'holdings'}`
          : 'Reading supported holdings on Base';

  return (
    <div className="db-you-overview-wrap">
    <section className="db-you-overview" aria-labelledby="db-you-name">
      <div className="db-you-main">
        <div className="db-you-identity">
          <div className="db-you-avatar"><ProfileAvatar imageUrl={avatarUrl} seed={avatar} size={132}/></div>
          <div>
            <span className="db-eyebrow">Your profile</span>
            <h2 id="db-you-name">{nickname || 'Early bird'}</h2>
            <span className="db-you-status"><ShieldCheck size={14}/>{syncLabel}</span>
          </div>
        </div>
        <div className="db-you-balance">
          <span className="db-eyebrow">Portfolio balance</span>
          <strong className={balance.startsWith('$') ? 'db-shine' : undefined}>{balance}</strong>
          <small>{balanceNote}</small>
        </div>
      </div>

      <div className="db-you-holdings" id="profile-holdings">
        <div className="db-you-holdings-label"><WalletCards size={18}/><span><strong>Holdings</strong><small>{connected ? `${holdings.length}${snapshot && snapshot.holdings.length > holdings.length ? '+' : ''} shown` : 'Not connected'}</small></span></div>
        {holdings.length > 0 ? <div className="db-you-holding-list" role="list">{holdings.map((holding) => {
          const value = positionUsdAtoms(holding, snapshot?.prices[holding.ticker]);
          return <div className="db-you-holding" role="listitem" key={holding.token}><StockIcon ticker={holding.ticker} size={42}/><span><strong>{holding.ticker}</strong><small>{value === null ? 'Unavailable' : usd(value)}</small></span></div>;
        })}</div> : <p className="db-you-holdings-empty">{connected ? (loading ? 'Reading your holdings…' : 'No supported tokenized stocks found yet.') : 'Your supported stocks will appear here after you connect through Sign in.'}</p>}
      </div>

    </section>
    <nav className="db-you-action-bar" aria-label="Profile actions">
      <button className="db-text-link" onClick={onEdit}><Pencil size={17}/> Manage profile <ChevronRight size={17}/></button>
      <span aria-hidden="true" />
      <button className="db-text-link" onClick={onViewHoldings} aria-expanded={holdingsExpanded}>View holdings <ChevronRight size={17}/></button>
    </nav>
    </div>
  );
}
