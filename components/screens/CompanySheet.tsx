'use client';

import React from 'react';
import { DiscoveryObject } from '@/lib/types';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Building2,
  MapPin,
  FileText,
  Coins,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CompanySheetProps {
  object: DiscoveryObject;
  onClose: () => void;
  onExploreOwnership: (object: DiscoveryObject) => void;
}

export default function CompanySheet({
  object,
  onClose,
  onExploreOwnership,
}: CompanySheetProps) {
  const { company, relationship } = object;

  const getRelationshipBadge = (type: string) => {
    switch (type) {
      case 'manufactured_by':
        return { label: 'Manufactured by', color: 'bg-day-blue/10 text-day-blue' };
      case 'service_operated_by':
        return { label: 'Service operated by', color: 'bg-deep-green/10 text-deep-green' };
      case 'brand_owned_by':
        return { label: 'Brand owned by', color: 'bg-apricot/30 text-ink' };
      case 'component_supplied_by':
        return { label: 'Component supplied by', color: 'bg-slate/15 text-ink' };
      default:
        return { label: 'Verified relationship', color: 'bg-porcelain text-slate' };
    }
  };

  const badge = getRelationshipBadge(relationship.relationshipType);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-sheet-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/30 backdrop-blur-xs transition-opacity"
    >
      <div
        className="w-full max-w-lg bg-paper rounded-t-[28px] sm:rounded-[28px] border border-edge-glass shadow-sheet max-h-[88dvh] overflow-y-auto p-6 space-y-6 animate-in slide-in-from-bottom duration-300"
      >
        {/* Sheet Header */}
        <div className="flex items-center justify-between pb-2 border-b border-edge-hairline">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-ink shadow-xs"
              style={{ backgroundColor: object.color }}
            >
              <Building2 className="w-5 h-5 text-ink" />
            </div>
            <div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${badge.color}`}>
                {badge.label}
              </span>
              <h2 id="company-sheet-title" className="text-xl font-bold text-ink">
                {company.name} <span className="text-sm font-mono text-slate">({company.ticker})</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sheet"
            className="w-9 h-9 rounded-full bg-porcelain flex items-center justify-center text-slate hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corporate Summary */}
        <div className="space-y-3">
          <p className="text-sm text-ink/90 leading-relaxed font-normal">
            {company.summary}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate bg-porcelain/60 p-3 rounded-xl">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate" />
              <span>{company.sector}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate" />
              <span className="truncate">{company.headquarters}</span>
            </div>
          </div>
        </div>

        {/* Verified Connection Claim */}
        <div className="p-4 rounded-2xl bg-porcelain/80 border border-edge-hairline space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-deep-green uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified Physical Relationship</span>
          </div>
          <p className="text-sm font-medium text-ink">
            {relationship.claim}
          </p>
          <p className="text-xs text-slate leading-relaxed">
            {relationship.explanation}
          </p>
        </div>

        {/* Primary Source Citation */}
        <div className="flex items-center justify-between text-xs text-slate p-3 rounded-xl border border-edge-hairline bg-paper">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-day-blue" />
            <div>
              <div className="font-semibold text-ink">{relationship.sourceName}</div>
              <div className="text-[11px] text-slate/80">Audited {relationship.checkedAt}</div>
            </div>
          </div>
          <a
            href={relationship.primarySourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-day-blue hover:underline text-xs"
          >
            <span>Source</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* What would I own? */}
        <div className="p-4 rounded-2xl bg-day-blue/5 border border-day-blue/15 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-day-blue uppercase tracking-wider">
            <Coins className="w-4 h-4" />
            <span>What would I own?</span>
          </div>
          <p className="text-xs text-ink/80 leading-relaxed">
            The room purchase flow is a simulation. For real supported tokens, issuer documents and external purchase links, return to Discover.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onExploreOwnership(object)}
            className="dw-primary w-full text-base font-semibold shadow-md flex items-center justify-center gap-2"
          >
            <span>Explore ownership</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
