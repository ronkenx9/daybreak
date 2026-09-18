'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, LoaderCircle, ShieldCheck, WalletCards } from 'lucide-react';
import { buyUrl, type StockToken } from '@/lib/base/tokens';
import { tradeInstrumentsForTicker, type TradeInstrument, type TradeQuote } from '@/lib/trading/model';
import { useAccountState } from './AccountProvider';

const shortIdentity = (value: string) => `${value.slice(0, 7)}…${value.slice(-6)}`;
const percent = (value: number | null) => value == null ? 'Unavailable' : `${(value * 100).toFixed(value < .001 ? 3 : 2)}%`;

export default function InstrumentComparison({ token }: { token: StockToken }) {
  const account = useAccountState();
  const instruments = useMemo(() => tradeInstrumentsForTicker(token.ticker), [token.ticker]);
  const suggested = instruments.find((item) => item.network === 'solana:mainnet' && account.solanaWallet && !account.user?.wallet) ?? instruments[0];
  const [selectedId, setSelectedId] = useState(suggested?.instrumentId ?? '');
  const [amount, setAmount] = useState('25');
  const [quote, setQuote] = useState<TradeQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const selectionTouched = useRef(false);
  useEffect(() => {
    if (!selectionTouched.current || !instruments.some((item) => item.instrumentId === selectedId)) setSelectedId(suggested?.instrumentId ?? '');
  }, [instruments, selectedId, suggested?.instrumentId]);
  const selected = instruments.find((item) => item.instrumentId === selectedId) ?? suggested;
  if (!selected) return null;
  const walletReady = selected.network === 'eip155:8453' ? Boolean(account.user?.wallet) : Boolean(account.solanaWallet);

  const choose = (instrument: TradeInstrument) => { selectionTouched.current = true; setSelectedId(instrument.instrumentId); setQuote(null); setError(''); };
  const requestQuote = async () => {
    const value = Number(amount);
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || !Number.isFinite(value) || value < 1 || value > 10_000) { setError('Enter a USDC amount from 1 to 10,000.'); return; }
    setLoading(true); setError(''); setQuote(null);
    try {
      const response = selected.network === 'eip155:8453'
        ? await fetch('/api/trades/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ticker: token.ticker, amount }) })
        : await fetch(`/api/solana/swap-quote?ticker=${encodeURIComponent(token.ticker)}&usdc=${encodeURIComponent(amount)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No quote is available for this instrument.');
      const next = data as TradeQuote;
      if (next.contractVersion !== 1 || next.instrumentId !== selected.instrumentId || next.network !== selected.network) throw new Error('The quote did not match the selected instrument.');
      setQuote(next);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Quote unavailable'); }
    finally { setLoading(false); }
  };

  return <section className="db-instrument-review" aria-labelledby={`instrument-review-${token.ticker}`}>
    <div className="db-section-heading"><div><span className="db-eyebrow">Choose the exact asset</span><h3 id={`instrument-review-${token.ticker}`}>Compare instruments</h3></div><span className="db-small-note">Same company · different products</span></div>
    <div className="db-instrument-grid" role="radiogroup" aria-label={`${token.name} instruments`}>{instruments.map((instrument) => {
      const active = instrument.instrumentId === selected.instrumentId;
      const compatible = instrument.network === 'eip155:8453' ? Boolean(account.user?.wallet) : Boolean(account.solanaWallet);
      return <button key={instrument.instrumentId} type="button" role="radio" aria-checked={active} disabled={loading} className={`db-instrument-card${active ? ' selected' : ''}`} onClick={() => choose(instrument)}>
        <span className="db-instrument-check">{active ? <Check size={13}/> : instrument.networkLabel.slice(0, 1)}</span>
        <span className="db-instrument-network">{instrument.networkLabel} · {instrument.issuerLabel}</span>
        <strong>{instrument.symbol}</strong><small>{instrument.productLabel}</small>
        <span className="db-instrument-fact"><b>Fund with</b> {instrument.funding.symbol} on {instrument.networkLabel}</span>
        <span className={`db-instrument-wallet${compatible ? ' ready' : ''}`}>{compatible ? 'Linked wallet ready' : `No linked ${instrument.networkLabel} wallet`}</span>
        <code title={instrument.identity}>{shortIdentity(instrument.identity)}</code>
      </button>;
    })}</div>
    <div className="db-quote-builder">
      <div className="db-quote-selection"><div><span>Selected instrument</span><strong>{selected.symbol} · {selected.networkLabel}</strong><small>{selected.issuerLabel} · exact identity verified in Daybreak’s registry</small></div><a href={selected.explorerUrl} target="_blank" rel="noreferrer">View contract <ArrowUpRight size={13}/></a></div>
      <label className="db-trade-amount"><span>You pay on {selected.networkLabel}</span><span><input disabled={loading} inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value.replace(/[^0-9.]/g, '').slice(0, 8)); setQuote(null); setError(''); }} aria-label="Amount in USDC"/><b>USDC</b></span></label>
      <button className="db-button db-blue-button db-trade-quote" disabled={loading || !amount} onClick={requestQuote}>{loading ? <><LoaderCircle className="db-spin" size={17}/> Checking {selected.quoteProvider}</> : <>Review {selected.quoteProvider === 'bankr' ? 'Bankr' : 'Jupiter'} quote <ArrowRight size={17}/></>}</button>
      {!walletReady && <p className="db-quote-wallet-note"><WalletCards size={15}/> You can inspect a quote now. A linked {selected.networkLabel} wallet will be required before any future in-app signing.</p>}
      {error && <p className="db-trade-error" role="alert">{error}</p>}
      {quote && <QuoteReview quote={quote} token={token}/>}
    </div>
    <p className="db-small-note">Daybreak selects only by exact registered contract or mint. It does not treat same-company instruments as interchangeable, bridge funds automatically, or infer available balance.</p>
  </section>;
}

function QuoteReview({ quote, token }: { quote: TradeQuote; token: StockToken }) {
  const networkCost = quote.fees.networkCostUsd == null ? 'Unavailable' : `$${quote.fees.networkCostUsd.toFixed(4)}`;
  return <div className="db-trade-review" aria-live="polite">
    <div className="db-trade-route"><span>{quote.input.amount} {quote.input.symbol}</span><ArrowRight size={16}/><strong>{quote.expectedOutput.amount} {quote.expectedOutput.symbol}</strong></div>
    <dl>
      <div><dt>Minimum received</dt><dd>{quote.minimumOutput.amount || 'Unavailable'} {quote.minimumOutput.symbol}</dd></div>
      <div><dt>Price impact</dt><dd>{percent(quote.fees.priceImpactPct)}</dd></div>
      <div><dt>Provider fee</dt><dd>{quote.fees.providerBps == null ? 'Unavailable' : `${quote.fees.providerBps / 100}%`}</dd></div>
      <div><dt>Estimated network cost</dt><dd>{networkCost}</dd></div>
      <div><dt>Slippage limit</dt><dd>{quote.fees.slippageBps / 100}%</dd></div>
      <div><dt>Quote time</dt><dd>{new Date(quote.quotedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</dd></div>
      <div><dt>Provider expiry</dt><dd>{quote.expiresAt ? new Date(quote.expiresAt).toLocaleTimeString() : 'Not supplied · refresh before acting'}</dd></div>
    </dl>
    <div className="db-trade-gate"><ShieldCheck size={18}/><div><strong>Review only · no transaction created.</strong><p>{quote.execution.note}</p></div></div>
    {quote.execution.capability === 'external_handoff' && <a className="db-button db-blue-button" href={buyUrl(token)} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={17}/> Open independent Uniswap route</a>}
    <p className="db-small-note">The external venue does not execute this {quote.provider} quote. Review its exact asset, price and costs again before signing.</p>
  </div>;
}
