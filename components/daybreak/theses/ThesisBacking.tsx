'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, LoaderCircle, Lock, ShieldCheck, WalletCards } from 'lucide-react';
import { useAccountState } from '../AccountProvider';
import { useXLayerBacking, xlayerStockForCompany } from './useXLayerBacking';
import type { ThesisView } from './types';
import { decimalToRaw } from '@/lib/trading/model';
import { XLAYER_STOCK_DECIMALS } from '@/lib/xlayer/tokens';
import { XLAYER_VAULT_ADDRESS, XLAYER_VAULT_DURATIONS, thesisUri, type VaultThesis } from '@/lib/xlayer/vault';
import { backWithPermitTx, friendlyWalletError, openThesisTx, waitForXLayerReceipt, withdrawTx } from '@/lib/xlayer/actions';

const fmt = (v: string, d = 4) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d });
const left = (ts: number) => { const s = ts - Date.now() / 1000; if (s <= 0) return 'Unlocked'; const d = Math.floor(s / 86400); return d >= 1 ? `${d} days left` : `${Math.ceil(s / 3600)} hours left`; };
type Step = { state: 'idle' } | { state: 'working'; label: string } | { state: 'done'; label: string; hash: string } | { state: 'error'; message: string };

/** "Back with real stock": lock xStocks on X Layer behind this thesis. The first backer also
 * opens the thesis's vault entry (one extra transaction); everyone after signs one permit and
 * sends one transaction. Stock unlocks in full when the lock period ends. */
export default function ThesisBacking({ thesis }: { thesis: ThesisView }) {
  const account = useAccountState();
  const queryClient = useQueryClient();
  const stock = xlayerStockForCompany(thesis.companyId);
  const { backingFor, query, wallet } = useXLayerBacking();
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState<number>(XLAYER_VAULT_DURATIONS[1].seconds);
  const [step, setStep] = useState<Step>({ state: 'idle' });

  const holdings = useQuery({
    queryKey: ['xlayer-holdings', wallet], enabled: !!wallet && !!stock, staleTime: 15_000, retry: 1,
    queryFn: async ({ signal }) => { const r = await fetch(`/api/xlayer/holdings?address=${wallet}`, { signal, cache: 'no-store' }); if (!r.ok) throw new Error('unavailable'); return r.json() as Promise<{ items: { symbol: string; tokenBalance: string; shares: string }[]; gasBalanceOkb?: string | null }>; },
  });
  if (!stock || !XLAYER_VAULT_ADDRESS) return null;

  const backing = backingFor(thesis.slug, thesis.companyId);
  const held = holdings.data?.items.find((h) => h.symbol === stock.symbol) ?? null;
  const noGas = holdings.data?.gasBalanceOkb != null && Number(holdings.data.gasBalanceOkb) === 0;
  const mine = backing?.yourStock && Number(backing.yourStock) > 0 ? backing.yourStock : null;
  const busy = step.state === 'working';
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ['xlayer-theses'] }), queryClient.invalidateQueries({ queryKey: ['xlayer-holdings'] })]);

  async function run(label: string, action: () => Promise<string>) {
    try {
      const hash = await action();
      setStep({ state: 'working', label: 'Confirming on X Layer…' });
      await waitForXLayerReceipt(hash);
      await refresh();
      setStep({ state: 'done', label, hash });
      setAmount('');
    } catch (error) { setStep({ state: 'error', message: friendlyWalletError(error) }); }
  }

  const lock = () => run(`Locked ${amount} ${stock.symbol} behind this thesis`, async () => {
    const raw = decimalToRaw(amount, XLAYER_STOCK_DECIMALS);
    if (!raw || raw === '0') throw new Error(`Enter how much ${stock.symbol} to lock.`);
    if (held && BigInt(raw) > BigInt(decimalToRaw(held.tokenBalance, XLAYER_STOCK_DECIMALS) ?? '0')) throw new Error(`You hold ${fmt(held.tokenBalance)} ${stock.symbol} on X Layer.`);
    let target: VaultThesis | null = backing && !backing.expired ? backing : null;
    if (!target) {
      // First backer: open this thesis's vault entry, then find it (it is the newest entry for this URL by us).
      setStep({ state: 'working', label: 'Step 1 of 2 · confirm opening this thesis on X Layer…' });
      const openHash = await openThesisTx(account, stock, thesisUri(thesis.slug), duration);
      setStep({ state: 'working', label: 'Step 1 of 2 · confirming on X Layer…' });
      await waitForXLayerReceipt(openHash);
      const fresh = await fetch(`/api/xlayer/theses?backer=${wallet}`, { cache: 'no-store' }).then((r) => r.json()) as { theses: VaultThesis[] };
      target = fresh.theses.filter((t) => t.thesisSlug === thesis.slug && t.wrapper === stock.wrapper && !t.expired && t.creator.toLowerCase() === wallet!.toLowerCase()).sort((a, b) => b.id - a.id)[0] ?? null;
      if (!target) throw new Error('The thesis opened, but X Layer has not caught up yet. Try locking again in a moment.');
      setStep({ state: 'working', label: 'Step 2 of 2 · sign the permit (no gas)…' });
    } else setStep({ state: 'working', label: 'Sign the permit in your wallet (no gas)…' });
    return backWithPermitTx(account, stock, wallet!, target.id, raw, () => setStep({ state: 'working', label: 'Confirm the lock in your wallet…' }));
  });

  const withdraw = () => { if (!backing) return; setStep({ state: 'working', label: 'Confirm the withdrawal in your wallet…' }); run(`Withdrew your ${stock.symbol}`, () => withdrawTx(account, backing.id)); };

  return <section className="db-thesis-backing" aria-labelledby={`backing-${thesis.slug}`}>
    <div className="db-thesis-backing-head"><span className="db-eyebrow"><Lock size={12}/> Back with real stock · X Layer</span>
      <a className="db-text-link" href={`https://www.oklink.com/xlayer/address/${XLAYER_VAULT_ADDRESS}`} target="_blank" rel="noreferrer">Vault <ArrowUpRight size={12}/></a></div>
    <h3 id={`backing-${thesis.slug}`}>{backing && Number(backing.lockedStock) > 0 ? <>{fmt(backing.lockedStock)} {stock.symbol} locked by {backing.backers} backer{backing.backers === 1 ? '' : 's'}</> : 'Put real stock behind this idea'}</h3>
    <p className="db-small-note">Lock {stock.symbol} in the Daybreak vault on X Layer. It stays yours and unlocks in full when the lock period ends. No payouts, no admin keys.{backing ? ` ${backing.expired ? 'This lock period has ended.' : `Lock period: ${left(backing.expiresAt)}.`}` : ''}</p>
    {mine && <p className="db-small-note"><ShieldCheck size={13}/> You locked {fmt(mine)} {stock.symbol}.</p>}

    {query.isError ? <p className="db-small-note">X Layer is unavailable right now.</p>
      : !wallet ? <p className="db-quote-wallet-note"><WalletCards size={15}/> Sign in to back this thesis with {stock.symbol}.</p>
      : backing?.expired ? (mine ? <button className="db-button db-blue-button" disabled={busy} onClick={withdraw}>Withdraw {fmt(mine)} {stock.symbol}</button> : null)
      : <>
        <p className="db-small-note">{holdings.isPending ? 'Reading your balance…' : held ? `You hold ${fmt(held.tokenBalance)} ${stock.symbol} on X Layer.` : `You don’t hold ${stock.symbol} on X Layer yet.`}{noGas ? ' You also need a little OKB for network fees.' : ''}</p>
        <div className="db-thesis-backing-form">
          <label className="db-trade-amount"><span>Amount</span><span><input inputMode="decimal" placeholder="0.0" disabled={busy || !held} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, '').slice(0, 24))} aria-label={`Amount of ${stock.symbol} to lock`}/><b>{stock.symbol}</b></span></label>
          {!backing && <label className="db-trade-amount"><span>Lock for</span><select value={duration} disabled={busy} onChange={(e) => setDuration(Number(e.target.value))}>{XLAYER_VAULT_DURATIONS.map((d) => <option key={d.seconds} value={d.seconds}>{d.label}</option>)}</select></label>}
          <button className="db-button db-blue-button" disabled={busy || !held || !amount} onClick={lock}><Lock size={15}/> Lock {stock.symbol}</button>
        </div>
        {!backing && <p className="db-small-note">You’re first: you set the lock period for everyone, and confirm one extra transaction to open it on X Layer.</p>}
      </>}
    {step.state === 'working' && <p className="db-small-note" role="status"><LoaderCircle className="db-spin" size={14}/> {step.label}</p>}
    {step.state === 'done' && <p className="db-small-note" role="status"><ShieldCheck size={14}/> {step.label}. <a href={`https://www.oklink.com/xlayer/tx/${step.hash}`} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={12}/></a></p>}
    {step.state === 'error' && <p className="db-trade-error" role="alert">{step.message}</p>}
  </section>;
}
