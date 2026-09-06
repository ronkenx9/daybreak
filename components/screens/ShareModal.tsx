'use client';

import React, { useState } from 'react';
import { WorldState, ShareSnapshot } from '@/lib/types';
import { DISCOVERY_CATALOG } from '@/lib/catalog';
import {
  X,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Lock,
} from 'lucide-react';

interface ShareModalProps {
  worldState: WorldState;
  onClose: () => void;
}

export default function ShareModal({ worldState, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  // Generate privacy-safe snapshot (Strip all wallet, accounts, and financial fields)
  const snapshot: ShareSnapshot = {
    id: `share_${Date.now()}`,
    version: 1,
    worldName: 'My Dayworld',
    interests: worldState.interests,
    objectIds: worldState.placedObjects.map((p) => p.objectId),
    createdAt: Date.now(),
  };

  // Safe serialized hash payload
  const encodedPayload =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}#share=${encodeURIComponent(
          btoa(JSON.stringify(snapshot))
        )}`
      : '';

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(encodedPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/30 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg bg-paper rounded-t-[28px] sm:rounded-[28px] border border-edge-glass shadow-sheet max-h-[88dvh] overflow-y-auto p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-edge-hairline">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-day-blue/10 flex items-center justify-center text-day-blue">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="share-modal-title" className="text-xl font-bold text-ink">
                Share your world
              </h2>
              <span className="text-xs text-slate">Privacy-first room snapshot</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="w-9 h-9 rounded-full bg-porcelain flex items-center justify-center text-slate hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Strict Privacy Guarantee Box */}
        <div className="p-4 rounded-2xl bg-meadow/40 border border-deep-green/15 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-deep-green uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Strict Privacy Contract</span>
          </div>
          <p className="text-xs text-ink/90 leading-relaxed font-medium">
            Your room layout and curated objects are shared. This share link excludes your wallet address, transaction history and holdings. Connecting a wallet separately sends its public address to our holdings API and RPC provider.
          </p>
        </div>

        {/* Snapshot Preview */}
        <div className="p-4 rounded-2xl bg-porcelain border border-edge-hairline space-y-3">
          <div className="text-xs font-semibold text-slate uppercase tracking-wider">
            Shared Room Contents
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {worldState.placedObjects.map((p) => {
              const obj = DISCOVERY_CATALOG.find((c) => c.id === p.objectId);
              if (!obj) return null;
              return (
                <div
                  key={p.objectId}
                  className="p-2.5 rounded-xl bg-paper border border-edge-hairline flex items-center gap-2"
                >
                  <div
                    className="w-4 h-4 rounded-md shrink-0"
                    style={{ backgroundColor: obj.color }}
                  />
                  <span className="font-semibold text-ink truncate">{obj.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Copy Share Link Action */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate block">
            Public Share Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={encodedPayload}
              className="flex-1 h-12 px-3.5 bg-porcelain rounded-xl border border-edge-hairline text-xs font-mono text-slate truncate focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="dw-primary px-5 text-sm font-semibold flex items-center gap-1.5 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
