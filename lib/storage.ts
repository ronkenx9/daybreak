import { WorldState, PlacedObjectState, TradeReceipt, HoldingItem } from './types';
import { DISCOVERY_CATALOG } from './catalog';

const STORAGE_KEY_WORLD = 'dayworld_state_v1';
const STORAGE_KEY_RECEIPTS = 'dayworld_receipts_v1';
const STORAGE_KEY_SETTINGS = 'dayworld_settings_v1';

export interface UserSettings {
  reduceMotion: boolean;
  reduceTransparency: boolean;
  soundEnabled: boolean;
  networkMode: 'fixture' | 'live';
  theme: 'light' | 'dark';
}

export const DEFAULT_SETTINGS: UserSettings = {
  reduceMotion: false,
  reduceTransparency: false,
  soundEnabled: false,
  networkMode: 'fixture',
  theme: 'light',
};

export const INITIAL_WORLD_STATE: WorldState = {
  id: 'world_local_01',
  schemaVersion: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  interests: [],
  placedObjects: [],
};

export function loadWorldState(): WorldState {
  if (typeof window === 'undefined') return INITIAL_WORLD_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORLD);
    if (!raw) return INITIAL_WORLD_STATE;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.placedObjects)) {
      return parsed;
    }
    return INITIAL_WORLD_STATE;
  } catch {
    return INITIAL_WORLD_STATE;
  }
}

export function saveWorldState(state: WorldState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY_WORLD,
      JSON.stringify({ ...state, updatedAt: Date.now() })
    );
  } catch (err) {
    console.error('Failed to save world state:', err);
  }
}

export function loadUserSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const value = JSON.parse(raw);
    return { reduceMotion: value?.reduceMotion === true, reduceTransparency: value?.reduceTransparency === true, soundEnabled: value?.soundEnabled === true, networkMode: 'fixture', theme: value?.theme === 'dark' ? 'dark' : 'light' };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveUserSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    document.documentElement.setAttribute(
      'data-reduce-motion',
      settings.reduceMotion ? 'true' : 'false'
    );
    document.documentElement.setAttribute(
      'data-reduce-transparency',
      settings.reduceTransparency ? 'true' : 'false'
    );
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function loadReceipts(): TradeReceipt[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECEIPTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveReceipt(receipt: TradeReceipt): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadReceipts();
    const updated = [receipt, ...existing];
    localStorage.setItem(STORAGE_KEY_RECEIPTS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save receipt:', err);
  }
}

export function calculateHoldings(receipts: TradeReceipt[]): HoldingItem[] {
  const map = new Map<string, { shares: number; spentUsd: number; symbol: string; lastUpdated: number }>();

  for (const r of receipts) {
    const cur = map.get(r.instrumentAddress) || {
      shares: 0,
      spentUsd: 0,
      symbol: r.symbol,
      lastUpdated: r.timestamp,
    };
    cur.shares += parseFloat(r.sharesPurchased) || 0;
    cur.spentUsd += parseFloat(r.amountSpentUsd) || 0;
    cur.lastUpdated = Math.max(cur.lastUpdated, r.timestamp);
    map.set(r.instrumentAddress, cur);
  }

  const holdings: HoldingItem[] = [];
  for (const [address, data] of map.entries()) {
    const matched = DISCOVERY_CATALOG.find(
      (o) => o.instrument.address.toLowerCase() === address.toLowerCase()
    );
    const companyName = matched ? matched.company.name : data.symbol;
    const price = matched ? matched.instrument.simulatedPriceUsd : 100;
    const estVal = (data.shares * price).toFixed(2);

    holdings.push({
      instrumentAddress: address as `0x${string}`,
      symbol: data.symbol,
      companyName,
      shares: data.shares.toFixed(4),
      estimatedValueUsd: estVal,
      lastUpdated: data.lastUpdated,
    });
  }

  return holdings;
}

export function resetAllData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_WORLD);
    localStorage.removeItem(STORAGE_KEY_RECEIPTS);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.removeItem('daybreak_profile_v1');
    document.documentElement.removeAttribute('data-reduce-motion');
    document.documentElement.removeAttribute('data-reduce-transparency');
  } catch (err) {
    console.error('Failed to clear data:', err);
  }
}
