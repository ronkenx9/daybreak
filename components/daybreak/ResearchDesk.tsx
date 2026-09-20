'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, FlaskConical, LoaderCircle } from 'lucide-react';
import { authedFetch } from '@/lib/account/api-client';
import type { ResearchPoint, ResearchResult } from '@/lib/economy/research';
import { useAccountState } from './AccountProvider';

type Job = { id: string; idempotencyKey: string; symbol: string; costCents: number; status: string; createdAt: string; result: ResearchResult | null };
type Dashboard = { dailySpendCapCents: number; spentTodayCents: number; freeRemainingToday: number; priceCents: number; memberPriceCents: number; member: boolean; available: boolean; jobs: Job[] };
const symbols = ['NVDA','AAPL','MSFT','TSLA','AMZN','GOOGL','META','COIN','CRCL','INTC','MSTR','SNDK'];
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function ResearchDesk({ onChanged }: { onChanged: () => Promise<void> }) {
  const account = useAccountState();
  const identity = account.authenticated ? account.user?.id : null;
  const [data, setData] = useState<Dashboard | null>(null);
  const [symbol, setSymbol] = useState('NVDA');
  const [selected, setSelected] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pendingKey = useRef<string | null>(null);
  const identityRef = useRef(identity);
  useEffect(() => {
    identityRef.current = identity; setData(null); setSelected(null); setError(''); pendingKey.current = null;
    if (identity) void authedFetch<Dashboard>('/api/economy/research').then(value => { if (identityRef.current === identity) setData(value); }).catch(() => { if (identityRef.current === identity) setError('Research is unavailable right now.'); });
  }, [identity]);
  const refresh = async () => { const value = await authedFetch<Dashboard>('/api/economy/research'); if (identityRef.current === identity) setData(value); return value; };
  const run = async () => {
    if (!data || !identity) return;
    const key = pendingKey.current ?? crypto.randomUUID(); pendingKey.current = key;
    const maxCostCents = data.freeRemainingToday ? 0 : data.member ? data.memberPriceCents : data.priceCents;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await authedFetch<{ job: Job }>('/api/economy/research/jobs', { method: 'POST', body: JSON.stringify({ symbol, idempotencyKey: key, maxCostCents }) });
      if (identityRef.current !== identity) return;
      if (response.job.status === 'completed') { setSelected(response.job); setNotice(`Brief ready · ${response.job.costCents ? money(response.job.costCents) : 'free'} used.`); pendingKey.current = null; }
      else setNotice('Brief is processing. Refresh the list shortly; your request will not be charged twice.');
      const refreshed = await Promise.allSettled([refresh(), onChanged()]);
      if (refreshed.some(item => item.status === 'rejected')) setNotice('Brief saved. Reload You if the balance or history has not refreshed.');
    } catch (caught) {
      if (identityRef.current !== identity) return;
      setError(caught instanceof Error ? caught.message : 'Brief could not complete.');
      const latest = await refresh().catch(() => null); void onChanged();
      if (latest?.jobs.some(job => job.status === 'failed' && job.idempotencyKey === key)) pendingKey.current = null;
    } finally { if (identityRef.current === identity) setBusy(false); }
  };
  const updateCap = async (value: number) => {
    setError('');
    try { await authedFetch('/api/economy/research', { method: 'PATCH', body: JSON.stringify({ dailySpendCapCents: value }) }); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update your cap.'); }
  };
  const brief = selected?.result;
  const renderPoint = (item: ResearchPoint, key: string) => <li key={key}>{item.text} <span>{item.sources.map(id => <a key={id} href={brief?.sources.find(source => source.id === id)?.url} target="_blank" rel="noopener noreferrer" aria-label={`Open source ${id}`}>[{id}]</a>)}</span></li>;
  return <section className="db-research-desk" aria-labelledby="research-desk-title">
    <div className="db-research-head"><div><span className="db-eyebrow">Research desk</span><h3 id="research-desk-title">A sourced view in one tap.</h3><p>AI compares recent company headlines, gives both sides of the case, and points to what to watch. Open the sources before acting.</p></div><FlaskConical size={25} aria-hidden="true"/></div>
    <div className="db-research-controls"><label>Company<select value={symbol} onChange={event => { setSymbol(event.target.value); pendingKey.current = null; }}>{symbols.map(item => <option key={item} value={item}>{item}</option>)}</select></label><label>Daily paid cap<select value={data?.dailySpendCapCents ?? 100} disabled={!data || busy} onChange={event => void updateCap(Number(event.target.value))}>{[0,25,50,100,200,500,1000].map(value => <option key={value} value={value}>{money(value)}</option>)}</select></label><button className="db-button db-blue-button" disabled={!data?.available || busy} onClick={() => void run()}>{busy ? <LoaderCircle size={15} className="db-spin"/> : <FlaskConical size={15}/>} {busy ? 'Building…' : data?.freeRemainingToday ? 'Build free brief' : `Build brief · ${money(data?.member ? data.memberPriceCents : data?.priceCents ?? 25)}`}</button></div>
    <p className="db-research-meter">{!data ? 'Loading allowance…' : !data.available ? 'Research provider unavailable. No credits can be used.' : `${data.freeRemainingToday} free today · ${money(data.spentTodayCents)} of ${money(data.dailySpendCapCents)} paid cap used${data.member ? ' · DAYC member price while monthly benefit remains' : ''}`}</p>
    {notice && <p role="status" className="db-economy-notice">{notice}</p>}{error && <p role="alert" className="db-thesis-error">{error}</p>}
    {brief && <article className="db-research-result"><div className="db-research-result-head"><div><span className="db-eyebrow">{brief.symbol} · AI snapshot</span><h4>{brief.summary.text}</h4></div><small>{new Date(brief.generatedAt).toLocaleString()}</small></div><div className="db-research-columns">{(['bull','bear','watch'] as const).map(kind => <div key={kind}><h5>{kind === 'bull' ? 'The case for' : kind === 'bear' ? 'The case against' : 'Watch next'}</h5><ul>{brief[kind].map((point,index) => renderPoint(point, `${kind}-${index}`))}</ul></div>)}</div><p className="db-research-disclaimer">{brief.disclaimer}</p><details><summary>Sources and dates</summary><ol>{brief.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <ArrowUpRight size={12}/></a><small>{source.publisher} · {new Date(source.publishedAt).toLocaleDateString()}</small></li>)}</ol></details></article>}
    {!!data?.jobs.length && <details className="db-economy-history db-research-history"><summary>Recent briefs</summary><ul>{data.jobs.map(job => <li key={job.id}><button type="button" disabled={job.status !== 'completed'} onClick={() => setSelected(job)}>{job.symbol} · {new Date(job.createdAt).toLocaleDateString()} · {job.status}</button><strong>{job.status === 'failed' ? 'returned' : job.costCents ? money(job.costCents) : 'free'}</strong></li>)}</ul></details>}
  </section>;
}
