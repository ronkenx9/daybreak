'use client';

import { useEffect, useRef, useState } from 'react';
import { authedFetch } from '@/lib/account/api-client';
import { useAccountState } from './AccountProvider';

type Refund = { id: string; amountCents: number; wallet: string; reason: string; status: string; createdAt: string };
type Submission = { id: string; summary: string; workUrl: string };
type Dispute = { challengeId: string; title: string; budgetCents: number; reason: string; submissions: Submission[] };
type Queue = { refunds: Refund[]; disputes: Dispute[] };
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function EconomyOperatorPanel() {
  const account = useAccountState(); const identity = account.authenticated ? account.user?.id : null;
  const identityRef = useRef(identity);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [notes, setNotes] = useState<Record<string,string>>({});
  const [hashes, setHashes] = useState<Record<string,string>>({});
  const [awards, setAwards] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { identityRef.current = identity; setQueue(null); setError(''); if (identity) void authedFetch<Queue>('/api/economy/admin/queue').then(value => { if (identityRef.current === identity) setQueue(value); }).catch(() => {}); }, [identity]);
  const refresh = async () => { const value = await authedFetch<Queue>('/api/economy/admin/queue'); if (identityRef.current === identity) setQueue(value); };
  const decide = async (kind: 'refund' | 'dispute', id: string, decision: string) => {
    const note = notes[id]?.trim() ?? '';
    if (note.length < (kind === 'dispute' ? 20 : 10)) { setError('Write an operator note before deciding.'); return; }
    if (decision !== 'processing' && !window.confirm(decision === 'denied' ? 'Deny and return Credits only if no treasury USDC transfer was sent. Continue?' : `Confirm ${decision} for this ${kind}?`)) return;
    setBusy(id); setError(''); setNotice('');
    try {
      const path = kind === 'refund' ? `/api/economy/admin/refunds/${id}` : `/api/economy/admin/disputes/${id}`;
      await authedFetch(path, { method: 'POST', body: JSON.stringify({ decision, note, refundTxHash: hashes[id], submissionId: awards[id] }) });
      setNotice(`${kind === 'refund' ? 'Refund' : 'Dispute'} ${decision} recorded.`); await refresh().catch(() => setNotice('Decision recorded. Reload You to refresh the review queue.'));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The decision could not be recorded.'); }
    finally { setBusy(''); }
  };
  if (!queue) return null;
  return <section className="db-economy-operator" aria-labelledby="economy-operator-title"><span className="db-eyebrow">Restricted operations</span><h3 id="economy-operator-title">Economy review</h3><p>Review evidence before deciding. Claim a refund before sending USDC. Only an exact confirmed transfer from the treasury to the original wallet can be marked fulfilled.</p>
    {!queue.refunds.length && !queue.disputes.length && <p>No open cases.</p>}
    {queue.refunds.map(item => <article key={item.id}><div><strong>{money(item.amountCents)} USDC refund</strong><small>{item.status} · {new Date(item.createdAt).toLocaleString()}</small></div><p>{item.reason}</p><code>{item.wallet}</code><label>Review note<textarea minLength={10} maxLength={1000} value={notes[item.id] ?? ''} onChange={event => setNotes(value => ({ ...value, [item.id]: event.target.value }))}/></label>{item.status === 'processing' && <label>Confirmed Base USDC transfer hash<input value={hashes[item.id] ?? ''} onChange={event => setHashes(value => ({ ...value, [item.id]: event.target.value }))} placeholder="0x…"/></label>}<div className="db-economy-operator-actions">{item.status === 'pending' && <button className="db-button db-blue-button" disabled={busy === item.id} onClick={() => void decide('refund', item.id, 'processing')}>Claim before transfer</button>}{item.status === 'processing' && <button className="db-button db-blue-button" disabled={busy === item.id || !/^0x[0-9a-f]{64}$/i.test(hashes[item.id] ?? '')} onClick={() => void decide('refund', item.id, 'fulfilled')}>Verify transfer & fulfill</button>}<button className="db-button" disabled={busy === item.id} onClick={() => void decide('refund', item.id, 'denied')}>{item.status === 'processing' ? 'Deny only if no transfer sent' : 'Deny & release credits'}</button></div></article>)}
    {queue.disputes.map(item => <article key={item.challengeId}><strong>{item.title} · {money(item.budgetCents)} reserved</strong><p>{item.reason}</p><div className="db-economy-operator-submissions">{item.submissions.map(submission => <label key={submission.id}><input type="radio" name={`award-${item.challengeId}`} value={submission.id} checked={awards[item.challengeId] === submission.id} onChange={() => setAwards(value => ({ ...value, [item.challengeId]: submission.id }))}/><span>{submission.summary} <a href={submission.workUrl} target="_blank" rel="noopener noreferrer">Read work ↗</a></span></label>)}</div><label>Resolution note<textarea minLength={20} maxLength={1000} value={notes[item.challengeId] ?? ''} onChange={event => setNotes(value => ({ ...value, [item.challengeId]: event.target.value }))}/></label><div className="db-economy-operator-actions"><button className="db-button db-blue-button" disabled={busy === item.challengeId || !awards[item.challengeId]} onClick={() => void decide('dispute', item.challengeId, 'award')}>Award selected work</button><button className="db-button" disabled={busy === item.challengeId} onClick={() => void decide('dispute', item.challengeId, 'refund')}>Return to sponsor</button></div></article>)}
    {notice && <p className="db-economy-notice" role="status">{notice}</p>}{error && <p className="db-thesis-error" role="alert">{error}</p>}
  </section>;
}
