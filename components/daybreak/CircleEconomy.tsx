'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Coins, LoaderCircle, Plus, X } from 'lucide-react';
import { authedFetch } from '@/lib/account/api-client';

type Challenge = { id: string; title: string; brief: string; criteria: string; budgetCents: number; deadline: string; status: string; isSponsor: boolean };
type Submission = { id: string; summary: string; workUrl: string; createdAt: string };
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CircleEconomy({ slug, canFund }: { slug: string; canFund: boolean }) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [draft, setDraft] = useState(false);
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [criteria, setCriteria] = useState('');
  const [budget, setBudget] = useState('5');
  const [days, setDays] = useState('7');
  const [workUrl, setWorkUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [submittingTo, setSubmittingTo] = useState('');
  const [reviewing, setReviewing] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);

  const refresh = useCallback(async () => {
    const [listed, account] = await Promise.all([
      authedFetch<{ challenges: Challenge[] }>(`/api/economy/circles/${encodeURIComponent(slug)}/challenges`),
      authedFetch<{ balanceCents: number }>('/api/economy/account'),
    ]);
    setChallenges(listed.challenges);
    setBalance(account.balanceCents);
  }, [slug]);
  useEffect(() => { setChallenges([]); setError(''); void refresh().catch(() => setError('Research challenges are unavailable right now.')); }, [refresh]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const budgetCents = Math.round(Number(budget) * 100);
      const deadline = new Date(Date.now() + Number(days) * 86_400_000).toISOString();
      const fingerprint = JSON.stringify({ slug, title, brief, criteria, budgetCents, days });
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
      await authedFetch(`/api/economy/circles/${encodeURIComponent(slug)}/challenges`, { method: 'POST', body: JSON.stringify({ title, brief, criteria, budgetCents, deadline, idempotencyKey: attempt.current.key }) });
      attempt.current = null; setDraft(false); setTitle(''); setBrief(''); setCriteria(''); setNotice('Challenge funded. The credits are reserved for its award.');
      void refresh().catch(() => setError('Challenge created, but the list could not refresh. Reload to see it.'));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not fund challenge.'); }
    finally { setBusy(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await authedFetch(`/api/economy/challenges/${submittingTo}/submissions`, { method: 'POST', body: JSON.stringify({ workUrl, summary }) });
      setSubmittingTo(''); setWorkUrl(''); setSummary(''); setNotice('Research submitted to the sponsor.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not submit research.'); }
    finally { setBusy(false); }
  };
  const review = async (id: string) => {
    setError(''); setReviewing(id);
    try { const result = await authedFetch<{ submissions: Submission[] }>(`/api/economy/challenges/${id}/submissions`); setSubmissions(result.submissions); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load submissions.'); }
  };
  const award = async (id: string, submissionId: string) => {
    setBusy(true); setError('');
    try { await authedFetch(`/api/economy/challenges/${id}/award`, { method: 'POST', body: JSON.stringify({ submissionId }) }); setReviewing(''); setNotice('Awarded. Credits are now available to the contributor.'); void refresh().catch(() => setError('Award recorded, but the list could not refresh.')); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not award challenge.'); }
    finally { setBusy(false); }
  };
  const cancel = async (id: string) => {
    setBusy(true); setError('');
    try { await authedFetch(`/api/economy/challenges/${id}/cancel`, { method: 'POST' }); setReviewing(''); setNotice('Unsubmitted challenge cancelled. Credits returned.'); void refresh().catch(() => setError('Refund recorded, but the list could not refresh.')); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not cancel challenge.'); }
    finally { setBusy(false); }
  };

  return <section className="db-circle-economy" aria-labelledby="circle-economy-title">
    <div className="db-circle-economy-head"><div><span className="db-eyebrow">Fund the insight</span><h2 id="circle-economy-title">Research challenges</h2><p>Members fund specific work with Daybreak Credits. The sponsor chooses one submission for the stated award.</p></div>{canFund && <button className="db-button db-blue-button" onClick={() => setDraft(value => !value)}><Plus size={16}/> Fund research</button>}</div>
    {canFund && balance !== null && <p className="db-small-note">Your available credits: <strong>{money(balance)}</strong></p>}
    {draft && <form className="db-economy-form" onSubmit={create}><button type="button" className="db-economy-close" aria-label="Close challenge form" onClick={() => setDraft(false)}><X size={16}/></button><h3>Fund a clear question</h3><p>Your budget is reserved now. If nobody submits, you can cancel and recover it. After a submission, review and award it or contact support to resolve a dispute.</p><label>Question or title<input required minLength={10} maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="What will change Nvidia's margin outlook?"/></label><label>What should someone research?<textarea required minLength={30} maxLength={2000} value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Describe the evidence, sources and deliverable."/></label><label>How will you judge the work?<textarea required minLength={20} maxLength={1000} value={criteria} onChange={e=>setCriteria(e.target.value)} placeholder="Source quality, balanced arguments and clear conclusion."/></label><div className="db-economy-form-pair"><label>Budget (USD credits)<input required type="number" min="1" max="250" step="0.01" value={budget} onChange={e=>setBudget(e.target.value)}/></label><label>Days to submit<select value={days} onChange={e=>setDays(e.target.value)}><option value="2">2 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label></div><button className="db-button db-blue-button" disabled={busy || balance === null || balance < Math.round(Number(budget) * 100)}>{busy ? 'Funding…' : `Reserve ${money(Math.round(Number(budget) * 100))}`}</button></form>}
    {challenges.length ? <div className="db-economy-challenges">{challenges.map(challenge => <article key={challenge.id} className="db-economy-challenge"><div className="db-economy-challenge-top"><span className="db-eyebrow">{challenge.status === 'awarded' ? 'Awarded' : challenge.status === 'cancelled' ? 'Cancelled' : new Date(challenge.deadline) < new Date() ? 'Submissions closed' : 'Open challenge'}</span><strong><Coins size={16}/> {money(challenge.budgetCents)}</strong></div><h3>{challenge.title}</h3><p>{challenge.brief}</p><details><summary>What counts as good work</summary><p>{challenge.criteria}</p></details><div className="db-economy-challenge-bottom"><small>Deadline {new Date(challenge.deadline).toLocaleDateString()}</small>{challenge.status === 'open' && (challenge.isSponsor ? <button className="db-text-link" onClick={() => void review(challenge.id)}>Review submissions →</button> : new Date(challenge.deadline) > new Date() ? <button className="db-text-link" onClick={() => { setSubmittingTo(challenge.id); setReviewing(''); }}>Submit research →</button> : null)}</div>{submittingTo === challenge.id && <form className="db-economy-form db-economy-inner-form" onSubmit={submit}><label>Public research link<input required type="url" value={workUrl} onChange={e=>setWorkUrl(e.target.value)} placeholder="https://…"/></label><label>What did you find?<textarea required minLength={30} maxLength={1000} value={summary} onChange={e=>setSummary(e.target.value)}/></label><div><button className="db-button db-blue-button" disabled={busy}>Submit research</button><button type="button" className="db-text-link" onClick={() => setSubmittingTo('')}>Cancel</button></div></form>}{reviewing === challenge.id && <div className="db-economy-reviews"><h4>Submissions</h4>{submissions.length ? submissions.map(item => <div key={item.id} className="db-economy-review"><p>{item.summary}</p><a href={item.workUrl} target="_blank" rel="noopener noreferrer">Read research <ArrowUpRight size={13}/></a><button className="db-button db-blue-button" disabled={busy} onClick={() => void award(challenge.id, item.id)}><Check size={14}/> Award {money(challenge.budgetCents)}</button></div>) : <p>No submissions yet.</p>}{!submissions.length && <button className="db-text-link" disabled={busy} onClick={() => void cancel(challenge.id)}>Cancel and refund credits</button>}</div>}</article>)}</div> : <p className="db-economy-empty">No funded challenges yet. Start with a question this Circle would genuinely want answered.</p>}
    {busy && <LoaderCircle size={17} className="db-spin" aria-label="Processing"/>}{notice && <p className="db-economy-notice" role="status">{notice}</p>}{error && <p className="db-thesis-error" role="alert">{error}</p>}
  </section>;
}
