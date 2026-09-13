'use client';

import { useState } from 'react';
import { ArrowRight, ArrowUpRight, LoaderCircle, WalletCards } from 'lucide-react';
import { buyUrl, type StockToken } from '@/lib/base/tokens';

interface Quote {
  ticker: string;
  stockName: string;
  from: { symbol: string; amount: string };
  to: { symbol: string; amount: string };
  minimumReceived: string;
  feeBps: number | null;
  priceImpactBps: number | null;
  networkCostsUsd: number | null;
  executionEnabled: boolean;
  note: string;
}

export default function TradeSheet({ token }: { token: StockToken }) {
  const [amount, setAmount] = useState('25');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestQuote() {
    setLoading(true); setError(''); setQuote(null);
    try {
      const response = await fetch('/api/trades/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ticker: token.ticker, amount }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Quote unavailable');
      setQuote(data as Quote);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Quote unavailable');
    } finally { setLoading(false); }
  }

  return <section className="db-trade-sheet" aria-labelledby={`trade-${token.ticker}`}>
    <div className="db-trade-heading">
      <div><span className="db-eyebrow">Bankr · live quote</span><h3 id={`trade-${token.ticker}`}>Buy {token.ticker} on Base</h3></div>
      <span className="db-trade-network">Base</span>
    </div>
    <label className="db-trade-amount">
      <span>You pay</span>
      <span><input inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value.replace(/[^0-9.]/g, '').slice(0, 8)); setQuote(null); }} aria-label="Amount in USDC"/><b>USDC</b></span>
    </label>
    <button className="db-button db-blue-button db-trade-quote" disabled={loading || !amount} onClick={requestQuote}>
      {loading ? <><LoaderCircle className="db-spin" size={17}/> Getting live quote</> : <>Review live quote <ArrowRight size={17}/></>}
    </button>
    {error && <p className="db-trade-error" role="alert">{error}</p>}
    {quote && <div className="db-trade-review" aria-live="polite">
      <div className="db-trade-route"><span>{quote.from.amount} {quote.from.symbol}</span><ArrowRight size={16}/><strong>{quote.to.amount} {quote.to.symbol}</strong></div>
      <dl>
        <div><dt>Minimum received</dt><dd>{quote.minimumReceived} {quote.to.symbol}</dd></div>
        <div><dt>Bankr fee</dt><dd>{quote.feeBps == null ? 'Unavailable' : `${quote.feeBps / 100}%`}</dd></div>
        <div><dt>Estimated network cost</dt><dd>{quote.networkCostsUsd == null ? 'Unavailable' : `$${quote.networkCostsUsd.toFixed(4)}`}</dd></div>
      </dl>
      <div className="db-trade-gate"><WalletCards size={18}/><div><strong>Reference quote.</strong><p>In-app signing is on the way. For now you can complete the buy on Base with your own wallet — Daybreak never moves your funds.</p></div></div>
      <a className="db-button db-blue-button" href={buyUrl(token)} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={17}/> Buy {token.ticker} on Base</a>
    </div>}
    <p className="db-small-note">Quotes use the configured Bankr integration. Eligible jurisdictions outside the US only. A quote does not reserve a price or move funds; you sign the purchase yourself.</p>
  </section>;
}
