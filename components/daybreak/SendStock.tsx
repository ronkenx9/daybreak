'use client';
import { useState } from 'react';
import { X, Gift, Copy, Check, ArrowRight } from 'lucide-react';
import Dialog from './Dialog';
import { StockIcon } from './Identity';
import { TOKENS, type StockToken } from '@/lib/base/tokens';

// THE SPEAR: send anyone a real slice of a stock, right in the chat.
// One action — pick a stock, pick an amount, create a shareable drop.
// This is the flow scaffold; the on-chain transfer + claim is the next build,
// so the confirm produces a preview drop (clearly labelled), not a real transfer.
const AMOUNTS = [1, 5, 10, 25];

export default function SendStock({ onClose }: { onClose: () => void }) {
  const [stock, setStock] = useState<StockToken>(TOKENS[0]);
  const [amount, setAmount] = useState(5);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = `https://www.daybreakcircles.lol/claim/${stock.ticker.toLowerCase()}-${amount}-preview`;

  const copy = () => { try { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };

  return (
    <Dialog wide label="Send a stock" onClose={onClose}>
      <div className="db-dialog-top"><span className="db-eyebrow"><Gift size={13} /> Send a stock</span><button aria-label="Close" className="db-icon-button" onClick={onClose}><X size={18} /></button></div>

      {done ? (
        <div className="db-send-done">
          <div className="db-send-done-mark"><Gift size={30} /></div>
          <h2>Drop ready to share.</h2>
          <p className="db-small-note">A ${amount} slice of {stock.name} ({stock.onchainSymbol}). Send this link into any chat — whoever opens it claims the stock into their wallet.</p>
          <div className="db-send-link"><code>{link}</code><button className="db-button db-blue-button" onClick={copy}>{copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy link</>}</button></div>
          <p className="db-small-note db-send-preview-note">Preview of the flow. The on-chain transfer and claim are wired next — no funds move here.</p>
          <button className="db-text-link" onClick={() => setDone(false)}>Send another</button>
        </div>
      ) : (
        <div className="db-send">
          <p className="db-send-lead">Send anyone a real slice of a stock — right in the chat. No app, no forms.</p>

          <div className="db-send-step"><span className="db-send-num">1</span><strong>Pick a stock</strong></div>
          <div className="db-send-stocks">{TOKENS.map((t) => (
            <button key={t.ticker} className={`db-send-stock${stock.ticker === t.ticker ? ' is-on' : ''}`} onClick={() => setStock(t)} aria-pressed={stock.ticker === t.ticker}>
              <StockIcon ticker={t.ticker} size={34} /><span>{t.ticker}</span>
            </button>
          ))}</div>

          <div className="db-send-step"><span className="db-send-num">2</span><strong>How much</strong></div>
          <div className="db-send-amounts">
            {AMOUNTS.map((a) => <button key={a} className={amount === a ? 'is-on' : ''} onClick={() => setAmount(a)} aria-pressed={amount === a}>${a}</button>)}
            <label className="db-send-custom">$<input inputMode="numeric" value={amount} onChange={(e) => setAmount(Math.max(1, Math.min(1000, Number(e.target.value.replace(/[^0-9]/g, '')) || 1)))} aria-label="Custom amount" /></label>
          </div>

          <div className="db-send-summary"><StockIcon ticker={stock.ticker} size={28} /><span>Sending <strong>${amount}</strong> of <strong>{stock.name}</strong></span></div>
          <button className="db-button db-blue-button db-send-cta" onClick={() => setDone(true)}>Create the drop <ArrowRight size={17} /></button>
          <p className="db-small-note">Backed by a real Coinbase tokenized stock on Base. The recipient claims it into their own wallet — no account needed to receive.</p>
        </div>
      )}
    </Dialog>
  );
}
