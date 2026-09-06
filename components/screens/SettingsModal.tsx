'use client';

import React from 'react';
import { UserSettings } from '@/lib/storage';
import {
  X,
  Sliders,
  Eye,
  Sparkles,
  Volume2,
  VolumeX,
  Trash2,
  Cpu,
  Info,
} from 'lucide-react';

interface SettingsModalProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onResetData: () => void;
  onClose: () => void;
}

export default function SettingsModal({
  settings,
  onUpdateSettings,
  onResetData,
  onClose,
}: SettingsModalProps) {
  const toggle = (key: keyof UserSettings) => {
    if (key === 'networkMode') {
      onUpdateSettings({
        ...settings,
        networkMode: settings.networkMode === 'fixture' ? 'live' : 'fixture',
      });
    } else {
      onUpdateSettings({
        ...settings,
        [key]: !settings[key],
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/30 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg bg-paper rounded-t-[28px] sm:rounded-[28px] border border-edge-glass shadow-sheet max-h-[88dvh] overflow-y-auto p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-edge-hairline">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-porcelain flex items-center justify-center text-ink">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-xl font-bold text-ink">
                Settings & Preferences
              </h2>
              <span className="text-xs text-slate">Accessibility & Environment</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-9 h-9 rounded-full bg-porcelain flex items-center justify-center text-slate hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Accessibility Toggles */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate">
            Accessibility
          </h3>

          {/* Reduce Motion */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-porcelain">
            <div>
              <div className="text-sm font-semibold text-ink">Reduce Motion</div>
              <div className="text-xs text-slate">Disable 3D rotation and settling tween</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.reduceMotion}
              onClick={() => toggle('reduceMotion')}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                settings.reduceMotion ? 'bg-day-blue' : 'bg-slate/30'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-paper shadow-sm absolute top-1 transition-transform ${
                  settings.reduceMotion ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Reduce Transparency */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-porcelain">
            <div>
              <div className="text-sm font-semibold text-ink">Reduce Transparency</div>
              <div className="text-xs text-slate">Switch glass materials to opaque paper</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.reduceTransparency}
              onClick={() => toggle('reduceTransparency')}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                settings.reduceTransparency ? 'bg-day-blue' : 'bg-slate/30'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-paper shadow-sm absolute top-1 transition-transform ${
                  settings.reduceTransparency ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate">Room purchases are simulations. Real token balances are available in the main Holdings page.</p>
        {/* Reset World */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate">
            Storage & Local Data
          </h3>
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset your local room, receipts, profile, bookmarks and preferences?')) {
                onResetData();
                onClose();
              }
            }}
            className="w-full min-h-[48px] p-3 rounded-2xl border border-brick/30 text-brick bg-brick/5 hover:bg-brick/10 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset all local Daybreak data</span>
          </button>
        </div>

        {/* About */}
        <div className="p-4 rounded-2xl bg-porcelain/60 text-xs text-slate space-y-1.5">
          <div className="font-semibold text-ink">DAYWORLD v0.1</div>
          <p>
            Curated stock discovery built for Base. Inspired by Apple interface clarity, daylight materials, and calm factual storytelling.
          </p>
        </div>
      </div>
    </div>
  );
}
