'use client';

import React, { useState } from 'react';
import { AVAILABLE_INTERESTS } from '@/lib/catalog';
import {
  Sparkles,
  Cpu,
  Gamepad2,
  Tv,
  Package,
  Coffee,
  Check,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';

interface InterestsScreenProps {
  onBack: () => void;
  onContinue: (selectedInterests: string[]) => void;
  initialInterests?: string[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  Cpu,
  Gamepad2,
  Tv,
  Package,
  Coffee,
};

export default function InterestsScreen({
  onBack,
  onContinue,
  initialInterests = [],
}: InterestsScreenProps) {
  const [selected, setSelected] = useState<string[]>(initialInterests);

  const toggleInterest = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((item) => item !== id));
    } else {
      if (selected.length < 3) {
        setSelected([...selected, id]);
      }
    }
  };

  return (
    <main className="min-h-[100dvh] flex flex-col justify-between px-6 py-8 max-w-lg mx-auto bg-porcelain">
      {/* Top Header */}
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="w-10 h-10 rounded-full border border-edge-hairline bg-paper flex items-center justify-center text-slate hover:text-ink transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-xs uppercase tracking-wider font-semibold text-slate">
          Step 1 of 2
        </span>
        <div className="w-10" />
      </header>

      {/* Main Form */}
      <div className="space-y-6 my-auto pt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            What are you into?
          </h1>
          <p className="text-sm text-slate mt-1.5 leading-relaxed">
            Choose up to 3 themes to furnish your initial room. This tailors your discovery tray, not an investment portfolio.
          </p>
        </div>

        {/* 6 Interests Grid */}
        <div className="grid grid-cols-2 gap-3">
          {AVAILABLE_INTERESTS.map((item) => {
            const isSelected = selected.includes(item.id);
            const Icon = ICON_MAP[item.icon] || Sparkles;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleInterest(item.id)}
                aria-pressed={isSelected}
                className={`min-h-[104px] p-4 rounded-2xl border text-left flex flex-col justify-between transition-all select-none ${
                  isSelected
                    ? 'bg-paper border-day-blue shadow-md ring-2 ring-day-blue/20'
                    : 'bg-paper/70 border-edge-hairline hover:bg-paper'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-day-blue text-paper'
                        : 'bg-porcelain text-slate'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-day-blue text-paper flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <div className="text-sm font-semibold text-ink">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate mt-0.5">
                    {isSelected ? 'Selected' : 'Tap to add'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Continue Action */}
      <div className="pt-6 space-y-3">
        <button
          type="button"
          onClick={() => onContinue(selected)}
          className="dw-primary w-full text-base font-semibold shadow-md flex items-center justify-center gap-2"
        >
          <span>
            {selected.length > 0
              ? `Continue with ${selected.length} selected`
              : 'Continue (explore all)'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </main>
  );
}
