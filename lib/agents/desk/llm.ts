import 'server-only';
import { RESEARCH_MODEL } from '@/lib/economy/research';

// Bankr LLM gateway (OpenAI-compatible), the same provider the research feature uses.
export const DESK_MODEL = process.env.DESK_MODEL || RESEARCH_MODEL;

/** Parse the first {...} object in a model reply; null when the reply is empty or cut off. */
export function parseJsonReply(content: unknown): Record<string, unknown> | null {
  if (typeof content !== 'string') return null;
  const start = content.indexOf('{'), end = content.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { const v = JSON.parse(content.slice(start, end + 1)); return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null; } catch { return null; }
}

async function complete(system: string, user: unknown, maxTokens: number): Promise<{ content: unknown; finish?: string }> {
  const key = (process.env.BANKR_LLM_KEY || process.env.BANKR_API_KEY)?.trim();
  if (!key) throw new Error('BANKR_LLM_KEY is not configured');
  const response = await fetch('https://llm.bankr.bot/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': key }, signal: AbortSignal.timeout(45_000), cache: 'no-store',
    body: JSON.stringify({ model: DESK_MODEL, temperature: 0.7, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(user) }] }),
  });
  if (!response.ok) throw new Error(`LLM gateway returned ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown }; finish_reason?: string }> };
  return { content: payload.choices?.[0]?.message?.content, finish: payload.choices?.[0]?.finish_reason };
}

// Reasoning models can spend much of the budget before answering, so the budget is generous,
// and a reply that is empty or cut off gets one retry with a firmer, shorter instruction.
export async function deskJson(system: string, user: unknown, maxTokens = 4000): Promise<Record<string, unknown>> {
  const first = await complete(system, user, maxTokens);
  const parsed = parseJsonReply(first.content);
  if (parsed) return parsed;
  const retry = await complete(`${system}\nReply with ONE compact, valid JSON object and nothing else. Keep every field short.`, user, Math.round(maxTokens * 1.5));
  const second = parseJsonReply(retry.content);
  if (second) return second;
  throw new Error(`model returned no valid JSON (finish: ${retry.finish ?? first.finish ?? 'unknown'})`);
}
