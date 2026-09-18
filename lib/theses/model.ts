import { createHash, randomUUID } from 'node:crypto';
import { requireThesisInstrument } from './instruments';

export interface ThesisDraftInput {
  instrumentId: string;
  title: string;
  summary: string;
  body: string;
  invalidation: string;
  horizon: string | null;
  sources: string[];
  tokenName: string;
  tokenSymbol: string;
}

function bounded(value: unknown, label: string, min: number, max: number): string {
  const clean = typeof value === 'string' ? value.trim() : '';
  if (clean.length < min || clean.length > max) throw new Error(`${label} must be ${min}..${max} characters`);
  return clean;
}

function sources(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 5) throw new Error('sources must contain at most 5 links');
  return value.map((source) => {
    if (typeof source !== 'string' || source.length > 500) throw new Error('Invalid source link');
    let url: URL;
    try { url = new URL(source); } catch { throw new Error('Invalid source link'); }
    if (url.protocol !== 'https:') throw new Error('Source links must use https');
    url.hash = '';
    return url.toString();
  }).filter((source, index, all) => all.indexOf(source) === index);
}

export function normalizeThesisDraft(body: Record<string, unknown>): ThesisDraftInput {
  const instrumentId = bounded(body.instrumentId, 'instrumentId', 10, 100);
  requireThesisInstrument(instrumentId, 'create');
  const tokenSymbol = bounded(body.tokenSymbol, 'tokenSymbol', 2, 10).toUpperCase();
  if (!/^[A-Z0-9]+$/.test(tokenSymbol)) throw new Error('tokenSymbol must use letters and numbers');
  return {
    instrumentId,
    title: bounded(body.title, 'title', 12, 120),
    summary: bounded(body.summary, 'summary', 24, 280),
    body: bounded(body.body, 'body', 80, 5_000),
    invalidation: bounded(body.invalidation, 'invalidation', 20, 600),
    horizon: typeof body.horizon === 'string' && body.horizon.trim() ? bounded(body.horizon, 'horizon', 2, 80) : null,
    sources: sources(body.sources ?? []),
    tokenName: bounded(body.tokenName, 'tokenName', 2, 32),
    tokenSymbol,
  };
}

export function thesisSlug(title: string): string {
  const stem = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 52) || 'thesis';
  return `${stem}-${randomUUID().slice(0, 8)}`;
}

export function thesisIntentHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function transactionMessageHash(message: Uint8Array): string {
  return createHash('sha256').update(message).digest('hex');
}
