'use client';

import { useEffect, useRef, useState } from 'react';
import { authedFetch } from '@/lib/account/api-client';
import { useAccountState } from './AccountProvider';

type Payment = { txHash: string; creditsCents: number; remainingCents: number; wallet: string; createdAt: string };
type Request = { id: string; amountCents: number; wallet: string; status: string; createdAt: string; refundTxHash: string | null; resolutionNote: string | null };
type Refunds = { refundableCents: number; reviewAvailable: boolean; payments: Payment[]; requests: Request[] };
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CreditRefunds({ balanceCents, onChanged }: { balanceCents: number; onChanged: () => Promise<void> }) {
  const account = useAccountState(); const identity = account.authenticated ? account.user?.id : null;
  const identityRef = useRef(identity);
  const [data, setData] = useState<Refunds | null>(null);
  const [payment, setPayment] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = async () => { const result = await authedFetch<Refunds>('/api/economy/refunds'); if (identityRef.current === identity) setData(result); return result; };
  useEffect(() => { identityRef.current = identity; setData(null); setPayment(''); setAmount(''); setReason(''); if (identity) void refresh().catch(() => { if (identityRef.current === identity) setError('Refund history is unavailable.'); }); }, [identity]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await authedFetch('/api/economy/refunds', { method: 'POST', body: JSON.stringify({ paymentTxHash: payment, amountCents: Math.round(Number(amount) * 100), reason }) });
      setPayment(''); setAmount(''); setReason(''); setNotice('Credits set aside. A refund review is pending; no USDC has been sent yet.');
      const updated = await Promise.allSettled([refresh(), onChanged()]);
      if (updated.some(item => item.status === 'rejected')) setNotice('Request saved. Reload You to refresh its status and balance.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Refund request could not be saved.'); }
    finally { setBusy(false); }
  };
  const cancel = async (id: string) => {
    setBusy(true); setError('');
    try { await authedFetch(`/api/economy/refunds/${id}/cancel`, { method: 'POST' }); setNotice('Request cancelled. Credits are available again.'); const updated = await Promise.allSettled([refresh(), onChanged()]); if (updated.some(item => item.status === 'rejected')) setNotice('Cancellation saved. Reload You to refresh its status and balance.'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not cancel the request.'); }
    finally { setBusy(false); }
  };
  return <details className="db-economy-refunds"><summary>Unused-credit refunds</summary><p>Request up to your unused purchased credits. The amount is set aside during review and returns only to the wallet used for the original USDC purchase. No transfer is automatic.</p>
    {data && !data.reviewAvailable && <p>Refund review is paused. Your purchased credits stay available.</p>}
    {data?.reviewAvailable && balanceCents > 0 && !!data.refundableCents && !!data.payments.some(item => item.remainingCents > 0) && <form onSubmit={submit} className="db-economy-form db-economy-inner-form"><label>Original purchase<select required value={payment} onChange={event => { setPayment(event.target.value); setAmount(''); }}><option value="">Choose a purchase</option>{data.payments.filter(item => item.remainingCents > 0).map(item => <option key={item.txHash} value={item.txHash}>{new Date(item.createdAt).toLocaleDateString()} · up to {money(Math.min(item.remainingCents,balanceCents,data.refundableCents))} · {item.wallet.slice(0,6)}…{item.wallet.slice(-4)}</option>)}</select></label><label>Amount in USD<input required type="number" min="0.01" max={Math.min(balanceCents, data.refundableCents, data.payments.find(item => item.txHash === payment)?.remainingCents ?? 0) / 100} step="0.01" value={amount} onChange={event => setAmount(event.target.value)}/></label><label>Reason<textarea required minLength={10} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)}/></label><button className="db-button db-blue-button" disabled={busy || !payment || !amount}>Request review</button></form>}
    {!!data?.requests.length && <ul>{data.requests.map(item => <li key={item.id}><span>{money(item.amountCents)} · {item.status}<small>{item.wallet.slice(0,6)}…{item.wallet.slice(-4)} · {new Date(item.createdAt).toLocaleDateString()}</small>{item.resolutionNote && item.status !== 'processing' && <small>{item.resolutionNote}</small>}{item.refundTxHash && <a href={`https://basescan.org/tx/${item.refundTxHash}`} target="_blank" rel="noopener noreferrer">View USDC refund ↗</a>}</span>{item.status === 'pending' && <button className="db-text-link" disabled={busy} onClick={() => void cancel(item.id)}>Cancel</button>}</li>)}</ul>}
    {notice && <p className="db-economy-notice" role="status">{notice}</p>}{error && <p className="db-thesis-error" role="alert">{error}</p>}
  </details>;
}
