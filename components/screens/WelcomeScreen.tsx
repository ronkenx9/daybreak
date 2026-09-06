'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: () => void;
  onExploreFirst: () => void;
}

export default function WelcomeScreen({ onStart, onExploreFirst }: WelcomeScreenProps) {
  return (
    <main className="min-h-[100dvh] flex flex-col justify-between px-6 py-10 max-w-lg mx-auto bg-porcelain">
      {/* Top Brand Mark */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative flex items-center justify-center bg-paper rounded-2xl shadow-sm border border-edge-hairline overflow-hidden">
            {/* Embedded SVG fallback */}
            <svg viewBox="0 0 32 32" className="w-6 h-6 text-day-blue" fill="currentColor">
              <path d="M16 4C9.37 4 4 9.37 4 16v12h24V16c0-6.63-5.37-12-12-12zm0 4c4.42 0 8 3.58 8 8v8H8v-8c0-4.42 3.58-8 8-8z" />
              <circle cx="16" cy="18" r="4" fill="#f3bb87" />
            </svg>
          </div>
          <span className="font-semibold text-2xl tracking-tight text-ink">dayworld</span>
        </div>
        <span className="text-xs uppercase tracking-wider font-semibold text-slate/80 bg-paper/80 px-2.5 py-1 rounded-full border border-edge-hairline">
          Base L2
        </span>
      </header>

      {/* Hero Content */}
      <div className="space-y-6 my-auto pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-meadow/40 border border-deep-green/10 text-deep-green text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Curiosity becomes connection</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.12]">
          Make room for what you love.
        </h1>

        <p className="text-slate text-base sm:text-lg leading-relaxed max-w-md">
          Assemble a sunlit miniature world, discover the verified companies behind familiar everyday objects, and explore tokenized equities on Base.
        </p>

        <div className="p-4 rounded-2xl bg-paper border border-edge-hairline shadow-card space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate">
            The Dayworld Standard
          </div>
          <ul className="text-xs text-ink/80 space-y-1.5 list-disc list-inside">
            <li>Fact-checked corporate supplier & creator connections</li>
            <li>No high-frequency trading streaks or gambling mechanics</li>
            <li>Zero wallet requirements to build and explore</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-6">
        <button
          type="button"
          onClick={onStart}
          className="dw-primary w-full text-base font-semibold shadow-md flex items-center justify-center gap-2"
        >
          <span>Make my world</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onExploreFirst}
          className="dw-secondary w-full text-sm font-medium flex items-center justify-center gap-2"
        >
          <Compass className="w-4 h-4 text-slate" />
          <span>I&apos;ll explore first</span>
        </button>
      </div>
    </main>
  );
}
