'use client';

import React from 'react';
import { HoldingItem, TradeReceipt } from '@/lib/types';
import {
  X,
  Coins,
  ExternalLink,
  Clock,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface HoldingsSheetProps {
  holdings: HoldingItem[];
  receipts: TradeReceipt[];
  onClose: () => void;
}

export default function HoldingsSheet({
  holdings,
  receipts,
  onClose,
}: HoldingsSheetProps) {
  const totalValueUsd = holdings.reduce(
    (acc, h) => acc + (parseFloat(h.estimatedValueUsd) || 0),
    0
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="holdings-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/30 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg bg-paper rounded-t-[28px] sm:rounded-[28px] border border-edge-glass shadow-sheet max-h-[88dvh] overflow-y-auto p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-edge-hairline">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-meadow/50 flex items-center justify-center text-deep-green">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 id="holdings-title" className="text-xl font-bold text-ink">
                Holdings & Receipts
              </h2>
              <span className="text-xs text-slate">Onchain equity on Base</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close holdings"
            className="w-9 h-9 rounded-full bg-porcelain flex items-center justify-center text-slate hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Portfolio Valuation Card */}
        <div className="p-5 rounded-2xl bg-porcelain border border-edge-hairline">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate">
            Total Observed Valuation
          </div>
          <div className="text-3xl font-bold text-ink tracking-tight font-mono mt-1">
            ${totalValueUsd.toFixed(2)}
          </div>
          <div className="text-xs text-slate mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-deep-green" />
            <span>Local simulation receipts — not onchain evidence</span>
          </div>
        </div>

        {/* Positions List */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate">
            Active Holdings ({holdings.length})
          </h3>

          {holdings.length === 0 ? (
            <div className="p-6 rounded-2xl bg-porcelain/50 border border-dashed border-edge-hairline text-center space-y-1 text-slate">
              <div className="text-sm font-semibold text-ink">No holdings yet</div>
              <div className="text-xs">
                Explore objects in your world and review an instrument to establish ownership.
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {holdings.map((h) => (
                <li
                  key={h.instrumentAddress}
                  className="p-3.5 rounded-xl border border-edge-hairline bg-paper flex items-center justify-between shadow-xs"
                >
                  <div>
                    <div className="font-semibold text-sm text-ink">{h.companyName}</div>
                    <div className="text-xs text-slate font-mono">{h.shares} shares ({h.symbol})</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-ink">
                      ${h.estimatedValueUsd}
                    </div>
                    <div className="text-[10px] text-slate">
                      {new Date(h.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Transaction Receipts */}
        {receipts.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate">
              Transaction History
            </h3>
            <ul className="space-y-2 text-xs">
              {receipts.slice(0, 5).map((r) => (
                <li
                  key={r.id}
                  className="p-3 rounded-xl bg-porcelain/70 border border-edge-hairline flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-ink">
                      Purchased {r.sharesPurchased} {r.symbol}
                    </div>
                    <div className="text-[11px] text-slate font-mono">
                      Block #{r.blockNumber} · ${r.amountSpentUsd} USDC
                    </div>
                  </div>
                  <span className="text-xs text-slate">Local simulation — no blockchain transaction</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
