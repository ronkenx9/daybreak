'use client';

import React, { useState, useEffect } from 'react';
import { DiscoveryObject, TradeQuote, TradeReceipt, TransactionStatus } from '@/lib/types';
import { generateQuote, executeTrade } from '@/lib/web3';
import { saveReceipt } from '@/lib/storage';
import {
  X,
  ShieldCheck,
  Coins,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface PurchaseReviewModalProps {
  object: DiscoveryObject;
  networkMode: 'fixture' | 'live';
  onClose: () => void;
  onTradeConfirmed: (receipt: TradeReceipt) => void;
}

export default function PurchaseReviewModal({
  object,
  networkMode,
  onClose,
  onTradeConfirmed,
}: PurchaseReviewModalProps) {
  const { instrument, company } = object;
  const [amountStr, setAmountStr] = useState<string>('25.00');
  const [quote, setQuote] = useState<TradeQuote | null>(null);
  const [status, setStatus] = useState<TransactionStatus>('reviewable');
  const [receipt, setReceipt] = useState<TradeReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(60);

  // Generate initial quote
  const refreshQuote = (amt: string) => {
    try {
      setStatus('quoting');
      setErrorMessage(null);
      const newQuote = generateQuote(instrument, amt);
      setQuote(newQuote);
      setTimeLeftSec(60);
      setStatus('reviewable');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to compute quote');
      setStatus('draft');
    }
  };

  useEffect(() => {
    refreshQuote(amountStr);
  }, []);

  // Expiration countdown
  useEffect(() => {
    if (!quote || status !== 'reviewable') return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((quote.expiresAt - Date.now()) / 1000));
      setTimeLeftSec(remaining);
      if (remaining <= 0) {
        setStatus('draft');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [quote, status]);

  // Handle amount change
  const handleAmountSelect = (preset: string) => {
    if (status !== 'reviewable' && status !== 'draft') return;
    setAmountStr(preset);
    refreshQuote(preset);
  };

  // Execute trade
  const handleConfirmPurchase = async () => {
    if (!quote) return;
    try {
      setStatus('awaiting_signature');
      setErrorMessage(null);

      const confirmedReceipt = await executeTrade(quote, networkMode);
      saveReceipt(confirmedReceipt);
      setReceipt(confirmedReceipt);
      setStatus('confirmed');
      onTradeConfirmed(confirmedReceipt);
    } catch (err: any) {
      setStatus('rejected');
      setErrorMessage(err?.message || 'Transaction could not be completed.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-review-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/50 backdrop-blur-xs"
    >
      {/* Opaque Paper surface per design requirement */}
      <div className="w-full max-w-lg bg-paper rounded-t-[28px] sm:rounded-[28px] border border-edge-hairline shadow-sheet max-h-[92dvh] overflow-y-auto p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-edge-hairline">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate">
              {networkMode === 'live' ? 'Live trading unavailable' : 'Deterministic Simulation'}
            </span>
            <h2 id="purchase-review-title" className="text-xl font-bold text-ink">
              Review simulation
            </h2>
          </div>

          {status !== 'awaiting_signature' && status !== 'confirming' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close review"
              className="w-9 h-9 rounded-full bg-porcelain flex items-center justify-center text-slate hover:text-ink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status: Confirmed Receipt */}
        {status === 'confirmed' && receipt ? (
          <div className="space-y-5 py-4">
            <div className="w-12 h-12 rounded-full bg-meadow/70 text-deep-green flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-ink">Simulation complete</h3>
              <p className="text-sm text-slate">
                Your ownership marker is now active in your world.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="p-4 rounded-2xl bg-porcelain space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate">Asset:</span>
                <span className="font-semibold text-ink">{company.name} ({instrument.symbol})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Quantity Acquired:</span>
                <span className="font-mono font-bold text-ink">{receipt.sharesPurchased} shares</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Total Spent:</span>
                <span className="font-semibold text-ink">${receipt.amountSpentUsd} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Block Number:</span>
                <span className="font-mono text-ink">#{receipt.blockNumber}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-edge-hairline">
                <span className="text-slate">Transaction Hash:</span>
                <span className="text-xs text-slate">Local simulation — no blockchain transaction</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="dw-primary w-full text-base font-semibold shadow-md"
            >
              Return to my room
            </button>
          </div>
        ) : (
          /* Normal Quoting & Review Flow */
          <div className="space-y-5">
            {/* Asset Headline */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-porcelain border border-edge-hairline">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs"
                style={{ backgroundColor: object.color }}
              >
                {instrument.symbol.substring(1)}
              </div>
              <div>
                <div className="text-sm font-bold text-ink">{company.name}</div>
                <div className="text-xs text-slate">
                  ${instrument.simulatedPriceUsd.toFixed(2)} / full share equivalent
                </div>
              </div>
            </div>

            {/* Amount Selection */}
            <div className="space-y-2">
              <label htmlFor="amount-input" className="text-xs font-semibold uppercase tracking-wider text-slate block">
                Choose Amount (USDC)
              </label>

              <div className="flex gap-2">
                {['10.00', '25.00', '50.00', '100.00'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={status === 'awaiting_signature' || status === 'confirming'}
                    onClick={() => handleAmountSelect(val)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      amountStr === val
                        ? 'bg-ink text-paper border-ink'
                        : 'bg-paper border-edge-hairline text-slate hover:bg-porcelain'
                    }`}
                  >
                    ${val.split('.')[0]}
                  </button>
                ))}
              </div>

              <div className="relative mt-2">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate font-semibold text-sm">
                  $
                </span>
                <input
                  id="amount-input"
                  type="number"
                  step="1"
                  min="1"
                  max="1000"
                  disabled={status === 'awaiting_signature' || status === 'confirming'}
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    refreshQuote(e.target.value);
                  }}
                  className="w-full h-12 pl-8 pr-16 bg-porcelain rounded-xl border border-edge-hairline text-base font-semibold text-ink font-mono focus:border-day-blue focus:ring-2 focus:ring-day-blue/20"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate">
                  USDC
                </span>
              </div>
            </div>

            {/* Live Quote Breakdown */}
            {quote && (
              <div className="p-4 rounded-2xl bg-porcelain/90 border border-edge-hairline space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate">Expected Output:</span>
                  <span className="font-mono font-bold text-sm text-ink">
                    ~{quote.expectedOutputShares} shares
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate">Protocol Fee:</span>
                  <span className="font-mono text-ink">${quote.feeUsd} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate">Est. Base L2 Gas:</span>
                  <span className="font-mono text-ink">${quote.estimatedGasUsd}</span>
                </div>

                <div className="pt-2 border-t border-edge-hairline flex items-center justify-between text-[11px] text-slate">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-day-blue" />
                    <span>
                      {timeLeftSec > 0
                        ? `Quote valid for ${timeLeftSec}s`
                        : 'Quote expired'}
                    </span>
                  </div>

                  {timeLeftSec <= 0 && (
                    <button
                      type="button"
                      onClick={() => refreshQuote(amountStr)}
                      className="text-day-blue font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh quote</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-brick/10 border border-brick/20 text-xs text-brick flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Progress indicators during submission */}
            {(status === 'awaiting_signature' || status === 'submitted' || status === 'confirming') && (
              <div className="p-4 rounded-2xl bg-day-blue/5 border border-day-blue/20 text-xs text-day-blue flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <div>
                  <div className="font-semibold">
                    {status === 'awaiting_signature' && 'Awaiting wallet authorization...'}
                    {status === 'submitted' && 'Purchase sent. Checking result on Base L2...'}
                    {status === 'confirming' && 'Reconciling confirmed ownership state...'}
                  </div>
                  <div className="text-[11px] text-slate mt-0.5">
                    Please do not close this window.
                  </div>
                </div>
              </div>
            )}

            {/* Authorization Action */}
            <div className="pt-2">
              <button
                type="button"
                disabled={
                  timeLeftSec <= 0 ||
                  status === 'awaiting_signature' ||
                  status === 'submitted' ||
                  status === 'confirming'
                }
                onClick={handleConfirmPurchase}
                className="dw-primary w-full text-base font-semibold shadow-md flex items-center justify-center gap-2"
              >
                <span>Authorize & purchase</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
