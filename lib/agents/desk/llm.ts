import 'server-only';
import { RESEARCH_MODEL } from '@/lib/economy/research';

// Bankr LLM gateway (OpenAI-compatible), the same provider the research feature uses.
export const DESK_MODEL = process.env.DESK_MODEL || RESEARCH_MODEL;

export async function deskJson(system: string, user: unknown, maxTokens = 1400): Promise<Record<string, unknown>> {
  const key = (process.env.BANKR_LLM_KEY || process.env.BANKR_API_KEY)?.trim();
  if (!key) throw new Error('BANKR_LLM_KEY is not configured');
  const response = await fetch('https://llm.bankr.bot/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': key }, signal: AbortSignal.timeout(45_000), cache: 'no-store',
    body: JSON.stringify({ model: DESK_MODEL, temperature: 0.7, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(user) }] }),
  });
  if (!response.ok) throw new Error(`LLM gateway returned ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('LLM returned no content');
  const json = content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1);
  return JSON.parse(json) as Record<string, unknown>;
}
