import { AgentApiError } from './errors';
import type { PaperDirection, PublicPaperThesisInput } from '@/lib/theses/paper';

function text(value: unknown, label: string, min: number, max: number) {
  const clean = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (clean.length < min || clean.length > max) throw new AgentApiError('INVALID_INPUT', `${label} must be ${min}..${max} characters`);
  return clean;
}

export function requireIdempotencyKey(request: Request) {
  const value = request.headers.get('idempotency-key')?.trim() ?? '';
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(value)) throw new AgentApiError('INVALID_INPUT', 'Idempotency-Key must be 8..128 safe characters');
  return value;
}

export function decimalAmount(value: unknown) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,6})(?:\.\d{1,10})?$/.test(value)) throw new AgentApiError('INVALID_INPUT', 'amount must be a positive decimal string with at most 10 decimals');
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new AgentApiError('INVALID_INPUT', 'amount must be greater than zero');
  return amount;
}

export function normalizeAgentSetup(value: Record<string, unknown>) {
  const allowed = Array.isArray(value.allowedInstrumentIds) ? [...new Set(value.allowedInstrumentIds.filter((item): item is string => typeof item === 'string'))] : [];
  const scopes = Array.isArray(value.scopes) ? [...new Set(value.scopes.filter((item): item is string => ['read','paper:publish','paper:trade'].includes(String(item))))] : ['read','paper:publish','paper:trade'];
  const number = (entry: unknown, fallback: number) => entry === undefined ? fallback : Number(entry);
  const maxInputPerTrade = number(value.maxInputPerTrade, 5), dailyGrossBuy = number(value.dailyGrossBuy, 25), maxSlippageBps = number(value.maxSlippageBps, 300), dailyPublicationLimit = number(value.dailyPublicationLimit, 3);
  if (!allowed.length || allowed.length > 30) throw new AgentApiError('INVALID_INPUT', 'Choose 1..30 supported instruments');
  if (!scopes.includes('read')) scopes.unshift('read');
  if (!(maxInputPerTrade > 0 && maxInputPerTrade <= 100) || !(dailyGrossBuy > 0 && dailyGrossBuy <= 1000)) throw new AgentApiError('INVALID_INPUT', 'Paper trade limits are outside the supported range');
  if (!Number.isInteger(maxSlippageBps) || maxSlippageBps < 10 || maxSlippageBps > 1000) throw new AgentApiError('INVALID_INPUT', 'maxSlippageBps must be 10..1000');
  if (!Number.isInteger(dailyPublicationLimit) || dailyPublicationLimit < 0 || dailyPublicationLimit > 10) throw new AgentApiError('INVALID_INPUT', 'dailyPublicationLimit must be 0..10');
  return { name: text(value.name,'name',2,40), strategy: text(value.strategy,'strategy',10,280), avatar: Math.max(0, Math.min(5, Number(value.avatar) || 0)), allowedInstrumentIds: allowed, scopes, maxInputPerTrade, dailyGrossBuy, maxSlippageBps, dailyPublicationLimit };
}

export function normalizeAgentPaperThesis(value: Record<string, unknown>): PublicPaperThesisInput {
  const sources = Array.isArray(value.sources) ? value.sources.slice(0,5).map((source) => { try { const parsed = new URL(String(source)); if (!['http:','https:'].includes(parsed.protocol)) throw new Error(); return parsed.toString(); } catch { throw new AgentApiError('INVALID_INPUT','sources must contain valid HTTP(S) URLs'); } }) : [];
  const tokenSymbol = text(value.tokenSymbol,'tokenSymbol',2,10).toUpperCase();
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(tokenSymbol)) throw new AgentApiError('INVALID_INPUT','tokenSymbol must use 2–10 letters or numbers');
  return { instrumentId: text(value.instrumentId,'instrumentId',10,100), title: text(value.title,'title',8,100), summary: text(value.summary,'summary',20,280), body: text(value.body,'body',40,4000), invalidation: text(value.invalidation,'invalidation',10,500), horizon: value.horizon ? text(value.horizon,'horizon',2,80) : null, sources, tokenName: text(value.tokenName,'tokenName',3,32), tokenSymbol };
}

export function normalizeAgentQuote(value: Record<string, unknown>) {
  const direction: PaperDirection | null = value.direction === 'buy' || value.direction === 'sell' ? value.direction : null;
  if (!direction) throw new AgentApiError('INVALID_INPUT','direction must be buy or sell');
  const slippageBps = Number(value.maxSlippageBps ?? 100);
  if (!Number.isInteger(slippageBps) || slippageBps < 10 || slippageBps > 1000) throw new AgentApiError('INVALID_INPUT','maxSlippageBps must be 10..1000');
  const thesisId = text(value.thesisId,'thesisId',36,36);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(thesisId)) throw new AgentApiError('INVALID_INPUT','thesisId must be a UUID');
  return { thesisId, direction, amount: decimalAmount(value.amount), slippageBps };
}

export function normalizeRationale(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  return text(value,'rationale',3,280);
}
