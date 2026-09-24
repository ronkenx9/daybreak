'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { encodeFunctionData, parseSignature } from 'viem';
import { ArrowUpRight, LoaderCircle, Lock, ShieldCheck, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import { useAccountState } from './AccountProvider';
import { decimalToRaw, type TradeInstrument } from '@/lib/trading/model';
import { xlayerStockFor } from '@/lib/xlayer/tokens';
import { XLAYER_VAULT_ADDRESS, XLAYER_VAULT_DURATIONS, XLAYER_VAULT_MAX_STATEMENT_BYTES, vaultAbi, type VaultThesis } from '@/lib/xlayer/vault';

interface Holding { symbol: string; tokenBalance: string; shares: string }
interface HoldingsSnap { items: Holding[]; gasBalanceOkb?: string | null }
type Step = { state: 'idle' } | { state: 'working'; label: string } | { state: 'done'; label: string; hash: string } | { state: 'error'; message: string };

const fmt = (value: string, max = 4) => Number(value).toLocaleString('en-US', { maximumFractionDigits: max });
const until = (ts: number) => { const s = ts - Date.now() / 1000; if (s <= 0) return 'Unlocked'; const d = Math.floor(s / 86400); return d >= 1 ? `${d}d left` : `${Math.ceil(s / 3600)}h left`; };

async function waitForReceipt(hash: string) {
  for (let i = 0; i < 45; i++) {
    const r = await fetch(`/api/xlayer/tx?hash=${hash}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
    if (r?.status === 'success') return;
    if (r?.status === 'reverted') throw new Error('The transaction reverted on X Layer. Nothing was locked.');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Still pending on X Layer. Check the explorer before trying again.');
}

/** X Layer view of one xStock on its stock page: your balance, and conviction backed with the real stock. */
export default function XLayerStockPanel({ instrument }: { instrument: TradeInstrument }) {
  const account = useAccountState();
  const queryClient = useQueryClient();
  const wallet = account.user?.wallet ?? null;
  const stock = xlayerStockFor(instrument.symbol)!;
  const [step, setStep] = useState<Step>({ state: 'idle' });
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [composer, setComposer] = useState({ open: false, bullish: true, duration: XLAYER_VAULT_DURATIONS[1].seconds as number, statement: '' });

  const holdings = useQuery({
    queryKey: ['xlayer-holdings', wallet], enabled: !!wallet, staleTime: 15_000, retry: 1,
    queryFn: async ({ signal }) => { const r = await fetch(`/api/xlayer/holdings?address=${wallet}`, { signal, cache: 'no-store' }); if (!r.ok) throw new Error('unavailable'); return r.json() as Promise<HoldingsSnap>; },
  });
  const theses = useQuery({
    queryKey: ['xlayer-theses', wallet], enabled: !!XLAYER_VAULT_ADDRESS, staleTime: 15_000, retry: 1,
    queryFn: async ({ signal }) => { const r = await fetch(`/api/xlayer/theses${wallet ? `?backer=${wallet}` : ''}`, { signal, cache: 'no-store' }); if (!r.ok) throw new Error('unavailable'); return r.json() as Promise<{ theses: VaultThesis[] }>; },
  });

  const held = holdings.data?.items.find((h) => h.symbol === stock.symbol) ?? null;
  const gas = holdings.data?.gasBalanceOkb;
  const noGas = gas != null && Number(gas) === 0;
  const mine = (theses.data?.theses ?? []).filter((t) => t.wrapper === stock.wrapper);
  const busy = step.state === 'working';

  async function run(label: string, action: () => Promise<string>) {
    setStep({ state: 'working', label });
    try {
      const hash = await action();
      setStep({ state: 'working', label: 'Confirming on X Layer…' });
      await waitForReceipt(hash);
      setStep({ state: 'done', label, hash });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['xlayer-theses'] }), queryClient.invalidateQueries({ queryKey: ['xlayer-holdings'] })]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Something went wrong';
      setStep({ state: 'error', message: /reject|denied|cancel/i.test(message) ? 'You cancelled in your wallet. Nothing was sent.' : message });
    }
  }

  const back = (t: VaultThesis) => run(`Backed with ${stock.symbol}`, async () => {
    const raw = decimalToRaw(amounts[t.id] ?? '', 18);
    if (!raw || raw === '0') throw new Error(`Enter how much ${stock.symbol} to lock.`);
    if (held && BigInt(raw) > BigInt(decimalToRaw(held.tokenBalance, 18) ?? '0')) throw new Error(`You hold ${fmt(held.tokenBalance)} ${stock.symbol} on X Layer.`);
    const info = await fetch(`/api/xlayer/permit?symbol=${stock.symbol}&owner=${wallet}`, { cache: 'no-store' }).then((r) => r.ok ? r.json() : Promise.reject(new Error('X Layer is unavailable right now')));
    const deadline = String(Math.floor(Date.now() / 1000) + 30 * 60);
    setStep({ state: 'working', label: 'Sign the permit in your wallet (no gas)…' });
    const signature = await account.signXLayerPermit({ token: stock.token, name: info.name, amount: raw, nonce: info.nonce, deadline });
    const { v, r, s, yParity } = parseSignature(signature as `0x${string}`);
    setStep({ state: 'working', label: 'Confirm the backing transaction…' });
    return account.sendXLayerTransaction({ to: XLAYER_VAULT_ADDRESS, data: encodeFunctionData({ abi: vaultAbi, functionName: 'backWithPermit', args: [BigInt(t.id), BigInt(raw), BigInt(deadline), Number(v ?? BigInt(27 + (yParity ?? 0))), r, s] }) });
  });

  const open = () => run('Thesis opened', async () => {
    const statement = composer.statement.trim();
    if (!statement) throw new Error('Write the thesis in a sentence.');
    if (new TextEncoder().encode(statement).length > XLAYER_VAULT_MAX_STATEMENT_BYTES) throw new Error('Keep the thesis under 256 characters.');
    setStep({ state: 'working', label: 'Confirm in your wallet…' });
    const hash = await account.sendXLayerTransaction({ to: XLAYER_VAULT_ADDRESS, data: encodeFunctionData({ abi: vaultAbi, functionName: 'openThesis', args: [stock.wrapper, composer.bullish, BigInt(composer.duration), statement] }) });
    setComposer((c) => ({ ...c, open: false, statement: '' }));
    return hash;
  });

  const withdraw = (t: VaultThesis) => run(`Withdrew ${stock.symbol}`, () =>
    account.sendXLayerTransaction({ to: XLAYER_VAULT_ADDRESS, data: encodeFunctionData({ abi: vaultAbi, functionName: 'withdraw', args: [BigInt(t.id), true] }) }));

  return <div className="db-quote-builder db-xlayer-panel">
    <div className="db-quote-selection"><div><span>On X Layer</span><strong>{stock.symbol} · {stock.name}</strong><small>Backed Finance · verified contract</small></div><a href={instrument.explorerUrl} target="_blank" rel="noreferrer">View contract <ArrowUpRight size={13}/></a></div>

    {!wallet ? <p className="db-quote-wallet-note"><WalletCards size={15}/> Sign in to see your {stock.symbol} and back a thesis with it.</p>
      : holdings.isPending ? <p className="db-small-note">Reading your X Layer balance…</p>
      : holdings.isError ? <p className="db-small-note">X Layer balances are unavailable right now. They have not been reported as zero.</p>
      : <p className="db-small-note"><b>You hold</b> {held ? `${fmt(held.shares)} ${stock.ticker} shares (${fmt(held.tokenBalance)} ${stock.symbol})` : `no ${stock.symbol} on X Layer yet`}{noGas ? ' · You need a little OKB on X Layer for network fees.' : ''}</p>}

    {!XLAYER_VAULT_ADDRESS ? <p className="db-small-note">Backing a thesis with real {stock.symbol} opens once the Daybreak vault is live on X Layer.</p> : <>
      <div className="db-section-heading"><div><span className="db-eyebrow">Conviction with real stock</span><h3>Lock {stock.symbol} behind a thesis</h3></div>{wallet && <button className="db-text-link" disabled={busy} onClick={() => setComposer((c) => ({ ...c, open: !c.open }))}>{composer.open ? 'Cancel' : 'Open a thesis'}</button>}</div>
      <p className="db-quote-wallet-note"><Lock size={13}/> Your stock stays yours: it unlocks in full when the thesis ends. No payouts, no admin keys.</p>

      {composer.open && <div className="db-xlayer-composer">
        <div role="radiogroup" aria-label="Stance" className="db-thesis-tabs">
          <button type="button" role="radio" aria-checked={composer.bullish} className={composer.bullish ? 'active' : ''} onClick={() => setComposer((c) => ({ ...c, bullish: true }))}><TrendingUp size={14}/> Bullish</button>
          <button type="button" role="radio" aria-checked={!composer.bullish} className={!composer.bullish ? 'active' : ''} onClick={() => setComposer((c) => ({ ...c, bullish: false }))}><TrendingDown size={14}/> Bearish</button>
        </div>
        <label className="db-trade-amount"><span>Thesis</span><textarea rows={2} maxLength={XLAYER_VAULT_MAX_STATEMENT_BYTES} value={composer.statement} onChange={(e) => setComposer((c) => ({ ...c, statement: e.target.value }))} placeholder={`Why ${stock.ticker}, in a sentence`}/></label>
        <label className="db-trade-amount"><span>Locked for</span><select value={composer.duration} onChange={(e) => setComposer((c) => ({ ...c, duration: Number(e.target.value) }))}>{XLAYER_VAULT_DURATIONS.map((d) => <option key={d.seconds} value={d.seconds}>{d.label}</option>)}</select></label>
        <button className="db-button db-blue-button" disabled={busy} onClick={open}>Publish on X Layer</button>
      </div>}

      {theses.isPending ? <p className="db-small-note">Loading theses…</p>
        : theses.isError ? <p className="db-small-note">Theses are unavailable right now.</p>
        : mine.length === 0 ? <p className="db-small-note">No {stock.ticker} theses yet. Open the first one.</p>
        : <div className="db-holdings-list">{mine.map((t) => {
          const position = t.yourStock && Number(t.yourStock) > 0 ? t.yourStock : null;
          return <div className="db-holding-row db-xlayer-thesis" key={t.id}>
            <div className="db-holding-main"><strong>{t.bullish ? 'Bullish' : 'Bearish'} · {t.statement}</strong><small>{fmt(t.lockedStock)} {stock.symbol} locked · {t.backers} backer{t.backers === 1 ? '' : 's'} · {until(t.expiresAt)}{position ? ` · yours: ${fmt(position)}` : ''}</small></div>
            <div className="db-holding-val">{!wallet ? null
              : t.expired ? (position ? <button className="db-button" disabled={busy} onClick={() => withdraw(t)}>Withdraw</button> : <small>Ended</small>)
              : <span className="db-xlayer-back"><input inputMode="decimal" aria-label={`Amount of ${stock.symbol} to lock`} placeholder="0.0" disabled={busy} value={amounts[t.id] ?? ''} onChange={(e) => setAmounts((a) => ({ ...a, [t.id]: e.target.value.replace(/[^0-9.]/g, '').slice(0, 20) }))}/><button className="db-button db-blue-button" disabled={busy || !held} onClick={() => back(t)}>Back</button></span>}</div>
          </div>;
        })}</div>}
    </>}

    {step.state === 'working' && <p className="db-small-note" role="status"><LoaderCircle className="db-spin" size={14}/> {step.label}</p>}
    {step.state === 'done' && <p className="db-small-note" role="status"><ShieldCheck size={14}/> {step.label}. <a href={`https://www.oklink.com/xlayer/tx/${step.hash}`} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={12}/></a></p>}
    {step.state === 'error' && <p className="db-trade-error" role="alert">{step.message}</p>}
  </div>;
}
