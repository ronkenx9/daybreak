import type { PaperDirection, PaperTradeIntent, PublicPaperThesisInput } from './paper';

export interface PendingPaperCreation {
  version: 1;
  accountId: string;
  input: PublicPaperThesisInput;
  intentId: string;
  createdAt: number;
}

export interface PendingPaperTrade {
  version: 1;
  accountId: string;
  thesisId: string;
  direction: PaperDirection;
  amount: number;
  intent: PaperTradeIntent;
  createdAt: number;
}

export interface PaperPendingStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function pendingPaperCreationKey(accountId: string) {
  return `daybreak:paper-creation:v1:${encodeURIComponent(accountId)}`;
}

export function validPendingPaperCreation(value: unknown, accountId: string): value is PendingPaperCreation {
  const row = value as Partial<PendingPaperCreation> | null;
  const input = row?.input as Partial<PublicPaperThesisInput> | undefined;
  return !!row && row.version === 1 && row.accountId === accountId
    && typeof row.intentId === 'string' && row.intentId.length > 0
    && typeof row.createdAt === 'number' && Number.isFinite(row.createdAt)
    && !!input && ['instrumentId', 'title', 'summary', 'tokenName', 'tokenSymbol'].every(key => typeof input[key as keyof PublicPaperThesisInput] === 'string');
}

export function readPendingPaperCreation(storage: PaperPendingStorage, accountId: string) {
  const key = pendingPaperCreationKey(accountId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (validPendingPaperCreation(parsed, accountId)) return parsed;
  } catch { /* Clear corrupt or inaccessible recovery state below. */ }
  try { storage.removeItem(key); } catch { /* Storage can be unavailable. */ }
  return null;
}

export function writePendingPaperCreation(storage: PaperPendingStorage, creation: PendingPaperCreation) {
  const current = readPendingPaperCreation(storage, creation.accountId);
  if (current && current.intentId !== creation.intentId) throw new Error('PAPER_PENDING_CREATION_CONFLICT');
  storage.setItem(pendingPaperCreationKey(creation.accountId), JSON.stringify(creation));
}

export function clearPendingPaperCreation(storage: PaperPendingStorage, creation: Pick<PendingPaperCreation, 'accountId' | 'intentId'>) {
  const current = readPendingPaperCreation(storage, creation.accountId);
  if (!current || current.intentId === creation.intentId) {
    try { storage.removeItem(pendingPaperCreationKey(creation.accountId)); } catch { /* A committed publication must not become an error because cleanup failed. */ }
  }
}

export function pendingPaperTradeKey(accountId: string, thesisId: string) {
  return `daybreak:paper-intent:v1:${encodeURIComponent(accountId)}:${thesisId}`;
}

export function validPendingPaperTrade(value: unknown, accountId: string, thesisId: string): value is PendingPaperTrade {
  const row = value as Partial<PendingPaperTrade> | null;
  return !!row && row.version === 1 && row.accountId === accountId && row.thesisId === thesisId
    && (row.direction === 'buy' || row.direction === 'sell')
    && typeof row.amount === 'number' && Number.isFinite(row.amount) && row.amount > 0
    && typeof row.createdAt === 'number' && Number.isFinite(row.createdAt)
    && !!row.intent && typeof row.intent.intentId === 'string'
    && typeof row.intent.minimumOutput === 'number' && Number.isFinite(row.intent.minimumOutput)
    && typeof row.intent.expiresAt === 'number' && Number.isFinite(row.intent.expiresAt);
}

export function readPendingPaperTrade(storage: PaperPendingStorage, accountId: string, thesisId: string) {
  const key = pendingPaperTradeKey(accountId, thesisId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (validPendingPaperTrade(parsed, accountId, thesisId)) return parsed;
  } catch { /* Clear corrupt or inaccessible recovery state below. */ }
  try { storage.removeItem(key); } catch { /* Storage can be unavailable. */ }
  return null;
}

export function writePendingPaperTrade(storage: PaperPendingStorage, trade: PendingPaperTrade) {
  const current = readPendingPaperTrade(storage, trade.accountId, trade.thesisId);
  if (current && current.intent.intentId !== trade.intent.intentId) {
    throw new Error('PAPER_PENDING_TRADE_CONFLICT');
  }
  storage.setItem(pendingPaperTradeKey(trade.accountId, trade.thesisId), JSON.stringify(trade));
}

export function clearPendingPaperTrade(storage: PaperPendingStorage, trade: Pick<PendingPaperTrade, 'accountId' | 'thesisId' | 'intent'>) {
  const current = readPendingPaperTrade(storage, trade.accountId, trade.thesisId);
  if (!current || current.intent.intentId === trade.intent.intentId) {
    try { storage.removeItem(pendingPaperTradeKey(trade.accountId, trade.thesisId)); } catch { /* A committed trade must not become an error because cleanup failed. */ }
  }
}

export function browserPaperStorage(): PaperPendingStorage | null {
  try { return window.localStorage; } catch { return null; }
}

export function samePaperMutationContext(
  expected: { accountId: string; thesisId: string | null; generation: number },
  current: { accountId: string | null; thesisId: string | null; generation: number },
) {
  return expected.accountId === current.accountId && expected.thesisId === current.thesisId && expected.generation === current.generation;
}

export async function runSerialPaperPoll(load: () => Promise<void>, schedule: () => void, stopped: () => boolean) {
  await load();
  if (!stopped()) schedule();
}

export function paperDiscoveryAfterPublish() {
  return { tab: 'paper' as const, query: '', page: 0 };
}
