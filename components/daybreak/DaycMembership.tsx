'use client';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { authedFetch } from '@/lib/account/api-client';
import { useAccountState } from './AccountProvider';
import { DAYBREAK_TOKEN, DAYC_MEMBER_MIN } from '@/lib/base/daybreak-token';

interface Eligibility { tier: 'member' | 'none'; threshold: number; balance: number }

export default function DaycMembership() {
  const account = useAccountState();
  const address = account.authenticated ? account.user?.wallet ?? undefined : undefined;
  const q = useQuery({
    queryKey: ['dayc-tier', address],
    enabled: !!address,
    queryFn: () => authedFetch<Eligibility>('/api/dayc/eligibility', { method: 'POST', body: JSON.stringify({ address }) }),
    staleTime: 60_000, retry: false,
  });
  if (!account.authenticated) return null;
  const member = q.data?.tier === 'member';
  return (
    <div className="db-wallet-row">
      <div>
        <strong>$DAYC membership {member && <span className="db-member-badge"><ShieldCheck size={12} /> Member</span>}</strong>
        <small>
          {!address ? 'Your Daybreak wallet is loading…'
            : q.isPending ? 'Checking your $DAYC balance…'
            : q.isError ? 'Could not check right now. Try again shortly.'
            : member ? `You hold ${Math.floor(q.data!.balance).toLocaleString()} DAYC — member perks unlocked.`
            : `Hold ${DAYC_MEMBER_MIN.toLocaleString()} $DAYC to unlock the member badge and perks.`}
        </small>
      </div>
      {!member && q.isSuccess && (
        <a className="db-text-link" href={DAYBREAK_TOKEN.buyUrl} target="_blank" rel="noopener noreferrer">Get $DAYC <ArrowUpRight size={15} /></a>
      )}
    </div>
  );
}
