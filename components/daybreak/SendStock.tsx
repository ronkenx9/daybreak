'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { encodeFunctionData } from 'viem';
import { ArrowRight, ArrowUpRight, Check, Gift, LoaderCircle, X } from 'lucide-react';
import Dialog from './Dialog';
import { StockIcon } from './Identity';
import { useAccountState } from './AccountProvider';
import { authedFetch } from '@/lib/account/api-client';
import { decimalToRaw } from '@/lib/trading/model';
import { XLAYER_STOCK_DECIMALS, xlayerStockFor } from '@/lib/xlayer/tokens';

// Send a real xStock on X Layer to a fellow circle member, straight from your own wallet.
// The recipient must have opted in to receiving; their address is resolved only at send time.
interface Holding { ticker: string; symbol: string; name: string; tokenBalance: string; shares: string }
interface Target { address: string; displayName: string; handle: string | null }
const transferAbi = [{ type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }] as const;
const fmt = (v: string) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 4 });
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

async function waitForReceipt(hash: string) {
  for (let i = 0; i < 45; i++) {
    const r = await fetch(`/api/xlayer/tx?hash=${hash}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
    if (r?.status === 'success') return;
    if (r?.status === 'reverted') throw new Error('The transfer reverted on X Layer. Nothing was sent.');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Still pending on X Layer. Check the explorer before trying again.');
}

export default function SendStock({ slug, memberRef, memberName, onClose }: { slug: string; memberRef: string; memberName: string; onClose: () => void }) {
  const account = useAccountState();
  const wallet = account.user?.wallet ?? null;
  const [symbol, setSymbol] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [target, setTarget] = useState<Target | null>(null);
  const [state, setState] = useState<{ step: 'pick' | 'review' | 'sending' | 'done' | 'error'; message?: string; hash?: string }>({ step: 'pick' });

  const holdings = useQuery({
    queryKey: ['xlayer-holdings', wallet], enabled: !!wallet, staleTime: 15_000, retry: 1,
    queryFn: async ({ signal }) => { const r = await fetch(`/api/xlayer/holdings?address=${wallet}`, { signal, cache: 'no-store' }); if (!r.ok) throw new Error('unavailable'); return r.json() as Promise<{ items: Holding[]; gasBalanceOkb?: string | null }>; },
  });
  const items = holdings.data?.items ?? [];
  const selected = items.find((h) => h.symbol === symbol) ?? items[0] ?? null;
  const raw = decimalToRaw(amount, XLAYER_STOCK_DECIMALS);
  const balanceRaw = selected ? decimalToRaw(selected.tokenBalance, XLAYER_STOCK_DECIMALS) : null;
  const tooMuch = !!raw && !!balanceRaw && BigInt(raw) > BigInt(balanceRaw);
  const valid = !!selected && !!raw && raw !== '0' && !tooMuch;
  const noGas = holdings.data?.gasBalanceOkb != null && Number(holdings.data.gasBalanceOkb) === 0;

  const review = async () => {
    setState({ step: 'sending', message: 'Checking the recipient…' });
    try {
      const t = await authedFetch<Target>(`/api/circles/send-target?slug=${encodeURIComponent(slug)}&member=${memberRef}`);
      setTarget(t); setState({ step: 'review' });
    } catch (error) { setState({ step: 'error', message: error instanceof Error ? error.message : 'This member cannot receive right now' }); }
  };

  const send = async () => {
    if (!selected || !raw || !target) return;
    const stock = xlayerStockFor(selected.symbol);
    if (!stock) return;
    setState({ step: 'sending', message: 'Confirm the transfer in your wallet…' });
    try {
      const hash = await account.sendXLayerTransaction({ to: stock.token, data: encodeFunctionData({ abi: transferAbi, functionName: 'transfer', args: [target.address as `0x${string}`, BigInt(raw)] }) });
      setState({ step: 'sending', message: 'Confirming on X Layer…', hash });
      await waitForReceipt(hash);
      setState({ step: 'done', hash });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transfer failed';
      setState({ step: 'error', message: /reject|denied|cancel/i.test(message) ? 'You cancelled in your wallet. Nothing was sent.' : message });
    }
  };

  return (
    <Dialog wide label="Send stock" onClose={onClose}>
      <div className="db-dialog-top"><span className="db-eyebrow"><Gift size={13} /> Send stock to {memberName}</span><button aria-label="Close" className="db-icon-button" onClick={onClose}><X size={18} /></button></div>
      {state.step === 'done' && selected && target ? (
        <div className="db-send-done">
          <div className="db-send-done-mark"><Check size={30} /></div>
          <h2>Sent.</h2>
          <p className="db-small-note">{amount} {selected.symbol} is now in {target.displayName}’s wallet on X Layer.</p>
          <a className="db-text-link" href={`https://www.oklink.com/xlayer/tx/${state.hash}`} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={14} /></a>
        </div>
      ) : !wallet ? <p className="db-small-note">Sign in to send stock.</p>
        : holdings.isPending ? <p className="db-small-note">Reading your xStocks on X Layer…</p>
        : holdings.isError ? <p className="db-small-note">X Layer balances are unavailable right now. Try again shortly.</p>
        : items.length === 0 ? <p className="db-small-note">You don’t hold any xStocks on X Layer yet. Once you do, you can send them to your circles here.</p>
        : (
        <div className="db-send">
          <div className="db-send-step"><span className="db-send-num">1</span><strong>Pick a stock</strong></div>
          <div className="db-send-stocks">{items.map((h) => (
            <button key={h.symbol} className={`db-send-stock${selected?.symbol === h.symbol ? ' is-on' : ''}`} disabled={state.step !== 'pick'} onClick={() => setSymbol(h.symbol)} aria-pressed={selected?.symbol === h.symbol}>
              <StockIcon ticker={h.ticker} size={34} /><span>{h.symbol}</span>
            </button>
          ))}</div>
          {selected && <p className="db-small-note">You hold {fmt(selected.tokenBalance)} {selected.symbol} ({fmt(selected.shares)} {selected.ticker} shares).</p>}

          <div className="db-send-step"><span className="db-send-num">2</span><strong>How much {selected?.symbol}</strong></div>
          <label className="db-trade-amount"><span>Amount</span><span><input inputMode="decimal" placeholder="0.0" value={amount} disabled={state.step !== 'pick'} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, '').slice(0, 24))} aria-label={`Amount of ${selected?.symbol ?? 'stock'} to send`} /><b>{selected?.symbol}</b></span></label>
          {tooMuch && <p className="db-trade-error">That’s more than you hold.</p>}
          {noGas && <p className="db-small-note">You need a little OKB on X Layer for the network fee.</p>}

          {state.step === 'review' && target && selected ? (
            <div className="db-send-summary"><StockIcon ticker={selected.ticker} size={28} /><span>Send <strong>{amount} {selected.symbol}</strong> to <strong>{target.displayName}</strong> ({short(target.address)}) on X Layer. Transfers can’t be undone.</span></div>
          ) : null}
          {state.step === 'pick' && <button className="db-button db-blue-button db-send-cta" disabled={!valid} onClick={review}>Review <ArrowRight size={17} /></button>}
          {state.step === 'review' && <button className="db-button db-blue-button db-send-cta" onClick={send}>Send {amount} {selected?.symbol} <ArrowRight size={17} /></button>}
          {state.step === 'sending' && <p className="db-small-note" role="status"><LoaderCircle className="db-spin" size={14} /> {state.message}</p>}
          {state.step === 'error' && <><p className="db-trade-error" role="alert">{state.message}</p><button className="db-text-link" onClick={() => setState({ step: 'pick' })}>Try again</button></>}
          <p className="db-small-note">A real xStocks transfer from your wallet to theirs on X Layer. Daybreak never holds your stock.</p>
        </div>
      )}
    </Dialog>
  );
}
