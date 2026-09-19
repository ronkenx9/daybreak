'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, CircleAlert, Clock3, LoaderCircle, Share2, ShieldCheck, TrendingUp } from 'lucide-react';
import { authedFetch } from '@/lib/account/api-client';
import { useAccountState } from '../AccountProvider';
import type { ThesisInstrumentView, ThesisView } from './types';

interface FlashReview {
  review: string; setupTransactionBase64: string | null; wallet: string;
  ticker: string; stockSymbol: string; stockMint: string; spendAmount: string;
  limitPrice: string; estimatedReceive: string | null; estimatedSpend: string;
  estimatedFeeUsd: string | null; orderMessage: string; deadline: string;
}
interface FlashOrder { orderId: string; status: string; qty: string; limitCrossPrice: string; placedAt: string | null }

export default function FlashStockOrder({ thesis, instrument }: { thesis: ThesisView; instrument?: ThesisInstrumentView }) {
  const account = useAccountState();
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [review, setReview] = useState<FlashReview | null>(null);
  const [orders, setOrders] = useState<FlashOrder[]>([]);
  const [busy, setBusy] = useState<'quote'|'submit'|null>(null);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  useEffect(() => { setReview(null); setError(''); }, [amount, limitPrice, thesis.id]);
  useEffect(() => {
    if (!account.authenticated || !account.solanaWallet) { setOrders([]); return; }
    let active = true;
    const load = () => authedFetch<{ orders: FlashOrder[] }>(`/api/theses/${thesis.id}/flash/orders?wallet=${encodeURIComponent(account.solanaWallet!)}`).then(data => { if (active) setOrders(data.orders); }).catch(() => {});
    void load();
    const timer = window.setInterval(load, 20_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [account.authenticated, account.solanaWallet, thesis.id, receipt]);
  if (!instrument || thesis.mode !== 'live') return null;

  const quote = async () => {
    if (!account.authenticated) { account.login(); return; }
    setBusy('quote'); setError(''); setReceipt('');
    try {
      const wallet = await account.ensureSolanaWallet();
      const result = await authedFetch<FlashReview>(`/api/theses/${thesis.id}/flash/quote`, { method: 'POST', body: JSON.stringify({ wallet, amount, limitPrice }) });
      setReview(result);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Flash quote unavailable'); }
    finally { setBusy(null); }
  };

  const submit = async () => {
    if (!review) return;
    setBusy('submit'); setError('');
    try {
      let setupSignature: string | undefined;
      if (review.setupTransactionBase64) {
        const signedTransaction = await account.signSolanaTransaction(review.setupTransactionBase64);
        const setup = await authedFetch<{ signature: string }>(`/api/theses/${thesis.id}/flash/setup`, { method: 'POST', body: JSON.stringify({ review: review.review, unsignedTransaction: review.setupTransactionBase64, signedTransaction }) });
        setupSignature = setup.signature;
      }
      const userSignature = await account.signSolanaMessage(review.orderMessage);
      const result = await authedFetch<{ orderId: string }>(`/api/theses/${thesis.id}/flash/order`, { method: 'POST', body: JSON.stringify({ review: review.review, setupSignature, userSignature }) });
      setReceipt(result.orderId); setReview(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Order could not be placed'); }
    finally { setBusy(null); }
  };

  const shareOrder = async () => {
    const url = `${location.origin}/theses/${thesis.slug}`;
    const text = `I placed a ${instrument.symbol} buy limit at ${limitPrice} USDC through this Daybreak thesis: ${thesis.title}`;
    try {
      if (navigator.share) await navigator.share({ title: thesis.title, text, url });
      else await navigator.clipboard.writeText(`${text}\n${url}`);
    } catch { /* Dismissing the share sheet leaves the placed order intact. */ }
  };

  return <aside className="db-thesis-trade-panel db-flash-stock-order">
    <span className="db-eyebrow">Act on this thesis · Flash</span>
    <h2>Buy {instrument.symbol}</h2>
    <p>Set the highest price you will pay for the stock token. Flash places a limit order with your Solana wallet.</p>
    <label className="db-thesis-amount"><span>Spend up to</span><div><input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="100" aria-label="USDC to spend"/><strong>USDC</strong></div></label>
    <label className="db-thesis-amount"><span>Maximum price per {instrument.symbol}</span><div><input inputMode="decimal" value={limitPrice} onChange={event => setLimitPrice(event.target.value)} placeholder="250" aria-label={`Maximum USDC per ${instrument.symbol}`}/><strong>USDC</strong></div></label>
    {review ? <div className="db-thesis-quote-review">
      <dl><div><dt>Order</dt><dd>Buy {review.stockSymbol} at {review.limitPrice} USDC or less</dd></div><div><dt>Maximum spend</dt><dd>{review.spendAmount} USDC</dd></div><div><dt>Estimated receive</dt><dd>{review.estimatedReceive ?? 'At execution'} {review.stockSymbol}</dd></div><div><dt>Estimated fee</dt><dd>{review.estimatedFeeUsd ? `$${review.estimatedFeeUsd}` : 'Shown by Flash at execution'}</dd></div><div><dt>Wallet setup</dt><dd>{review.setupTransactionBase64 ? 'One transaction, then order signature' : 'Already authorized'}</dd></div><div><dt>Order expires</dt><dd>24 hours after quote</dd></div></dl>
      <p><ShieldCheck size={15}/> {review.setupTransactionBase64 ? 'First authorize this exact USDC spend; then sign the limit order.' : 'Sign the limit order with your wallet.'} It may fill later or never fill.</p>
      <button className="db-button db-blue-button" disabled={busy !== null} onClick={submit}>{busy === 'submit' ? <LoaderCircle className="db-spin" size={17}/> : <TrendingUp size={17}/>} {busy === 'submit' ? 'Waiting for wallet…' : 'Place limit order'}</button>
      <button className="db-text-link db-flash-refresh" onClick={quote} disabled={busy !== null}>Refresh quote</button>
    </div> : <button className="db-button db-blue-button" disabled={!amount || !limitPrice || busy !== null} onClick={quote}>{busy === 'quote' ? <LoaderCircle className="db-spin" size={17}/> : <ArrowRight size={17}/>} {busy === 'quote' ? 'Getting Flash quote…' : 'Review stock order'}</button>}
    <p className="db-thesis-trade-note">Buying {instrument.symbol} gives you the stock token. To buy this thesis token, use the {thesis.tokenSymbol} / {instrument.symbol} market above. Your wallet needs USDC and some SOL for first-time setup.</p>
    {error && <p className="db-thesis-error" role="alert"><CircleAlert size={15}/>{error}</p>}
    {receipt && <div className="db-flash-receipt" role="status"><p><ShieldCheck size={15}/> Order submitted: <code>{receipt}</code>. A limit order can fill later; watch its status below.</p><button className="db-button" onClick={shareOrder}><Share2 size={14}/> Share this thesis</button></div>}
    {orders.length > 0 && <div className="db-flash-orders"><span className="db-eyebrow">Your {instrument.symbol} orders</span>{orders.map(order => <div key={order.orderId}><Clock3 size={14}/><span>{order.qty} USDC at ≤{order.limitCrossPrice}</span><strong>{order.status.replace(/^ORDER_STATUS_/, '').toLowerCase().replaceAll('_', ' ')}</strong></div>)}</div>}
  </aside>;
}
