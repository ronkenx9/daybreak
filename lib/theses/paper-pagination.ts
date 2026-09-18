const publicIdPattern = /^[a-f0-9]{64}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function participantCursor(value: string | null) {
  if (!value) return null;
  if (!publicIdPattern.test(value)) throw new Error('Invalid participant cursor');
  return value;
}

export interface TimeIdCursor { at: Date; id: string }

export type PaperPageKind = 'positions' | 'trades' | 'balances';
export type PaperCursorHistory = Record<PaperPageKind, Array<string | null>>;

export function updatePaperCursorHistory(history: PaperCursorHistory, kind: PaperPageKind, next: boolean, cursor: string | null, locked = false) {
  if (locked) return history;
  const stack = history[kind];
  if (!next) return stack.length > 1 ? { ...history, [kind]: stack.slice(0, -1) } : history;
  if (!cursor || stack.at(-1) === cursor) return history;
  return { ...history, [kind]: [...stack, cursor] };
}

export function encodeTimeIdCursor(value: { at: Date | string; id: string }) {
  return `${new Date(value.at).toISOString()}|${value.id}`;
}

export function timeIdCursor(value: string | null): TimeIdCursor | null {
  if (!value) return null;
  const split = value.lastIndexOf('|');
  const at = new Date(value.slice(0, split));
  const id = value.slice(split + 1);
  if (split < 1 || Number.isNaN(at.getTime()) || !uuidPattern.test(id)) throw new Error('Invalid activity cursor');
  return { at, id };
}
