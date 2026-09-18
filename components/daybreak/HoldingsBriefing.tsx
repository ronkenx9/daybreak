'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, CalendarDays, ChevronDown, Newspaper, ShieldCheck } from 'lucide-react';
import { authedFetch } from '@/lib/account/api-client';
import { briefingQueryKey } from '@/lib/account/cache';
import type { BriefingResponse } from '@/lib/briefing/model';
import { useAccountState } from './AccountProvider';

const status = (error: unknown) => (error as { status?: number } | null)?.status;
const when = (value: string, kind: 'news' | 'corporate_action') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return kind === 'news' ? 'Latest available' : 'Date pending';
  return new Intl.DateTimeFormat('en', kind === 'news'
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export default function HoldingsBriefing() {
  const account = useAccountState();
  const identity = account.authenticated ? account.user?.id ?? null : null;
  const queryClient = useQueryClient();
  const previousIdentity = useRef<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const queryKey = briefingQueryKey(identity);
  useEffect(() => {
    const previous = previousIdentity.current;
    if (previous && previous !== identity) {
      void queryClient.cancelQueries({ queryKey: briefingQueryKey(previous) });
      queryClient.removeQueries({ queryKey: briefingQueryKey(previous) });
    }
    previousIdentity.current = identity;
    setExpanded(false);
  }, [identity, queryClient]);
  const query = useQuery<BriefingResponse>({
    queryKey,
    queryFn: () => authedFetch<BriefingResponse>('/api/me/briefing'),
    enabled: account.authenticated && Boolean(identity),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: (count, error) => status(error) !== 401 && status(error) !== 503 && count < 1,
  });

  const data = query.data;
  const visible = expanded ? data?.items ?? [] : data?.items.slice(0, 3) ?? [];
  return <section className="db-briefing" aria-labelledby="holdings-briefing-title">
    <header className="db-briefing-head">
      <div><span className="db-eyebrow">Your holdings briefing</span><h2 id="holdings-briefing-title">What changed in your stocks?</h2></div>
      {data?.generatedAt && <small>Updated {when(data.generatedAt, 'news')}</small>}
    </header>
    {!account.authenticated ? <div className="db-briefing-state"><ShieldCheck size={21}/><div><strong>Private to your Daybreak account.</strong><p>Sign in and verify holdings to get company news and issuer events here.</p></div><button className="db-text-link" onClick={() => account.login()}>Sign in <ArrowUpRight size={14}/></button></div>
    : query.isPending ? <div className="db-briefing-state" role="status"><Newspaper size={21}/><div><strong>Building your briefing…</strong><p>Checking the companies tied to your current holding proofs.</p></div></div>
    : query.isError || data?.state === 'unavailable' ? <div className="db-briefing-state is-warning" role="status"><Newspaper size={21}/><div><strong>Your sources are taking a pause.</strong><p>No cached developments are available yet. Your verified holdings are unchanged.</p></div><button className="db-text-link" onClick={() => void query.refetch()}>Try again</button></div>
    : data?.state === 'empty_holdings' ? <div className="db-briefing-state"><ShieldCheck size={21}/><div><strong>Verify a holding to start.</strong><p>Daybreak uses short-lived eligibility proof and never shows balances in this briefing.</p></div><Link href="/app/groups" className="db-text-link">Verify in Circles <ArrowUpRight size={14}/></Link></div>
    : data?.state === 'no_developments' ? <div className="db-briefing-state"><CalendarDays size={21}/><div><strong>You’re caught up.</strong><p>No sourced developments were found for your verified companies.</p></div></div>
    : <>
      {data?.state === 'partial' && <p className="db-briefing-coverage" role="status">Showing available updates. {data.coverage.unavailable} of {data.coverage.companies} company feeds could not be refreshed.</p>}
      {data?.coverage.latestAvailable ? <p className="db-briefing-coverage">Includes the latest cached coverage for {data.coverage.latestAvailable} {data.coverage.latestAvailable === 1 ? 'company' : 'companies'}.</p> : null}
      <div className="db-briefing-list">{visible.map((item) => <article className="db-briefing-item" key={`${item.eventId}:${item.revision}`}>
        <div className="db-briefing-mark" aria-hidden="true">{item.symbol.slice(0, 2)}</div>
        <div className="db-briefing-copy">
          <div className="db-briefing-meta"><span>{item.kind === 'corporate_action' ? 'Issuer event' : item.companyType === 'private' ? 'Pre-IPO news' : 'Company news'}</span><time dateTime={item.occurredAt}>{when(item.occurredAt, item.kind)}</time></div>
          <h3>{item.title}</h3><p>{item.summary}</p><small>{item.relevance}</small>
          <div className="db-briefing-links"><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceName} <ArrowUpRight size={13}/></a><Link href={item.actionHref}>{item.actionLabel} <ArrowUpRight size={13}/></Link></div>
        </div>
      </article>)}</div>
      {(data?.items.length ?? 0) > 3 && <button className="db-briefing-more" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>{expanded ? 'Show less' : `Show all ${data!.items.length} updates`} <ChevronDown size={15}/></button>}
    </>}
  </section>;
}
