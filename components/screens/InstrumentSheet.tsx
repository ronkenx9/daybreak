'use client';

import React from 'react';
import { DiscoveryObject } from '@/lib/types';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Coins,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface InstrumentSheetProps {
  object: DiscoveryObject;
  onClose: () => void;
  onProceedToReview: (object: DiscoveryObject) => void;
}

export default function InstrumentSheet({
  object,
  onClose,
  onProceedToReview,
}: InstrumentSheetProps) {
  const { instrument, company } = object;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="instrument-sheet-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/30 backdrop-blur-xs transition-opacity"
    >
      <div className="w-full max-w-lg bg-paper rounded-t-[28px] sm:rounded-[28px] border border-edge-glass shadow-sheet max-h-[88dvh] overflow-y-auto p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-edge-hairline">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-day-blue bg-day-blue/10 px-2.5 py-0.5 rounded-full">
              Room simulation
            </span>
            <h2 id="instrument-sheet-title" className="text-xl font-bold text-ink mt-1">
              {instrument.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close instrument sheet"
            className="w-9 h-9 rounded-full bg-porcelain flex items-center justify-center text-slate hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pricing / Instrument Snapshot */}
        <div className="p-4 rounded-2xl bg-porcelain flex items-center justify-between border border-edge-hairline">
          <div>
            <div className="text-xs text-slate">Example price · not market data</div>
            <div className="text-2xl font-bold text-ink tracking-tight font-mono">
              ${instrument.simulatedPriceUsd.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate/80">Underlying: {company.name} ({company.ticker})</div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-deep-green bg-meadow/50 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Simulation only</span>
            </span>
            <div className="text-[11px] text-slate mt-1 font-mono">{instrument.symbol}</div>
          </div>
        </div>

        {/* Legal Rights Summary */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-day-blue" />
            <span>Simulation details</span>
          </h3>
          <p className="text-sm text-ink/90 leading-relaxed bg-paper p-4 rounded-2xl border border-edge-hairline">
            {instrument.rightsSummary}
          </p>
        </div>

        {/* Contract & Chain Details */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-2.5 rounded-xl bg-porcelain/60">
            <span className="text-slate">Chain:</span>
            <span className="font-semibold text-ink">Offline room preview</span>
          </div>
          <div className="flex justify-between p-2.5 rounded-xl bg-porcelain/60">
            <span className="text-slate">Issuer Program:</span>
            <span className="font-semibold text-ink">{instrument.tokenIssuer}</span>
          </div>
          <div className="flex justify-between p-2.5 rounded-xl bg-porcelain/60 items-center">
            <span className="text-slate">Fixture identifier:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-ink">
                {instrument.address.substring(0, 6)}...{instrument.address.substring(38)}
              </span>
              
            </div>
          </div>
        </div>

        {/* Neutrality Disclosure */}
        <div className="p-3.5 rounded-xl bg-apricot/15 border border-apricot/30 text-xs text-ink/80 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-ink shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            DAYWORLD connects everyday physical curiosities to corporate facts. This is educational exploration, not financial advice or a trade streak incentive.
          </p>
        </div>

        {/* Review Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onProceedToReview(object)}
            className="dw-primary w-full text-base font-semibold shadow-md flex items-center justify-center gap-2"
          >
            <span>Preview simulated purchase</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
