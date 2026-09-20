'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CreditCard, LoaderCircle, ShieldCheck } from 'lucide-react';
import { authedFetch } from '@/lib/account/api-client';
import { useAccountState } from './AccountProvider';
import CreditRefunds from './CreditRefunds';
import ResearchDesk from './ResearchDesk';
import EconomyOperatorPanel from './EconomyOperatorPanel';

type Account = { balanceCents: number; pinPriceCents: number; packs: number[]; entries: { deltaCents: number; kind: string; createdAt: string }[] };
type Quote = { id: string; creditsCents: number; amountRaw: string; expiresAt: string };
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function EconomyWallet() {
  const account = useAccountState();
  const [data, setData] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<{ quoteId: string; txHash: string } | null>(null);
  const userId = account.user?.id;
  const identityRef = useRef(userId);
  const load = async () => {
    if (!account.authenticated) return;
    setLoading(true);
    try { const result = await authedFetch<Account>('/api/economy/account'); if (identityRef.current === userId) setData(result); }
    catch { if (identityRef.current === userId) setError('Credits are unavailable right now.'); }
    finally { if (identityRef.current === userId) setLoading(false); }
  };
  useEffect(() => {
    identityRef.current = userId;
    if (!userId || !account.authenticated) { setData(null); setPending(null); return; }
    try { const saved = localStorage.getItem(`daybreak-credit-payment:${userId}`); setPending(saved ? JSON.parse(saved) as { quoteId: string; txHash: string } : null); } catch { setPending(null); }
    void load();
  }, [userId, account.authenticated]); // eslint-disable-line react-hooks/exhaustive-deps
  const confirm = async (payment: { quoteId: string; txHash: string }) => {
    setBusy(true); setError('');
    try {
      await authedFetch('/api/economy/credits/confirm', { method: 'POST', body: JSON.stringify(payment) });
      localStorage.removeItem(`daybreak-credit-payment:${userId}`);
      setPending(null); setNotice('Credits added to your account.'); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Payment could not be confirmed. Retry with the same transaction.'); }
    finally { setBusy(false); }
  };
  const buy = async (creditsCents: number) => {
    if (!account.user?.wallet) { setError('Link a Base wallet before buying credits.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const { quote } = await authedFetch<{ quote: Quote }>('/api/economy/credits/quote', { method: 'POST', body: JSON.stringify({ wallet: account.user.wallet, creditsCents }) });
      const payment = await account.payEconomyUsdc(quote.amountRaw);
      const recovery = { quoteId: quote.id, txHash: payment.hash };
      localStorage.setItem(`daybreak-credit-payment:${userId}`, JSON.stringify(recovery));
      setPending(recovery); setNotice('USDC transfer sent. Confirm after two Base blocks. Your transaction is saved here for recovery.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not start the payment.'); }
    finally { setBusy(false); }
  };
  if (!account.authenticated) return null;
  return <section className="db-economy-wallet" aria-labelledby="economy-wallet-title">
    <div className="db-economy-wallet-head"><div><span className="db-eyebrow">Daybreak Credits</span><h3 id="economy-wallet-title">Pay for useful work.</h3><p>Credits pay for Daybreak services and funded Circle research. They stay in your account and cannot be transferred to another user.</p></div><div className="db-economy-balance"><small>Available</small><strong>{loading && !data ? '…' : data ? money(data.balanceCents) : '—'}</strong></div></div>
    <div className="db-economy-packs"><span>Add credits with Base USDC</span>{(data?.packs ?? [500,1000,2500]).map(cents=><button key={cents} className="db-button" disabled={busy || !!pending || !data} onClick={()=>void buy(cents)}><CreditCard size={15}/>{money(cents)}</button>)}</div>
    <p className="db-economy-foot"><ShieldCheck size={14}/> The wallet shows the exact USDC transfer before you sign. Unused purchased credits remain an obligation to provide services.</p>
    {pending&&<div className="db-economy-pending"><div><strong>Payment awaiting confirmation</strong><small><a href={`https://basescan.org/tx/${pending.txHash}`} target="_blank" rel="noopener noreferrer">View transaction <ArrowRight size={12}/></a></small></div><button className="db-button db-blue-button" disabled={busy} onClick={()=>void confirm(pending)}>{busy?<LoaderCircle className="db-spin" size={15}/>:<ShieldCheck size={15}/>} Confirm credits</button></div>}
    {notice&&<p role="status" className="db-economy-notice">{notice}</p>}{error&&<p role="alert" className="db-thesis-error">{error}</p>}
    {!!data?.entries.length&&<details className="db-economy-history"><summary>Credit activity</summary><ul>{data.entries.map((entry,index)=><li key={`${entry.createdAt}-${index}`}><span>{({purchase_usdc:'Added with USDC',circle_pin:'Circle pin',challenge_escrow:'Research challenge funded',challenge_award:'Research award',challenge_refund:'Challenge refund',research_reserve:'Research brief',research_refund:'Research brief returned',refund_reserved:'Refund request reserved',refund_cancelled:'Refund request cancelled',refund_denied:'Refund review declined'} as Record<string,string>)[entry.kind] ?? entry.kind}<small>{new Date(entry.createdAt).toLocaleDateString()}</small></span><strong>{entry.deltaCents>0?'+':''}{money(entry.deltaCents)}</strong></li>)}</ul></details>}
    {data && <CreditRefunds balanceCents={data.balanceCents} onChanged={load}/>}
    <ResearchDesk onChanged={load}/>
    <EconomyOperatorPanel/>
  </section>;
}
