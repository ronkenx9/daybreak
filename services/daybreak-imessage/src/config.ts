export type AgentConfig = {
  spectrumProjectId: string;
  spectrumProjectSecret: string;
  apiBase: string;
  appBase: string;
  debounceMs: number;
  requestTimeoutMs: number;
  maxReplyChars: number;
  healthPort: number;
};

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function url(env: NodeJS.ProcessEnv, key: string, fallback: string): string {
  const value = env[key]?.trim() || fallback;
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error(`${key} must be an HTTP(S) origin without credentials`);
  }
  return parsed.origin;
}

function integer(env: NodeJS.ProcessEnv, key: string, fallback: number, min: number, max: number): number {
  const raw = env[key]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${key} must be an integer from ${min} to ${max}`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  return {
    spectrumProjectId: required(env, 'SPECTRUM_PROJECT_ID'),
    spectrumProjectSecret: required(env, 'SPECTRUM_PROJECT_SECRET'),
    apiBase: url(env, 'DAYBREAK_API_BASE', 'https://www.daybreakcircles.lol'),
    appBase: url(env, 'DAYBREAK_APP_BASE', 'https://www.daybreakcircles.lol'),
    debounceMs: integer(env, 'DAYBREAK_IMESSAGE_DEBOUNCE_MS', 1_200, 0, 10_000),
    requestTimeoutMs: integer(env, 'DAYBREAK_IMESSAGE_REQUEST_TIMEOUT_MS', 8_000, 1_000, 30_000),
    maxReplyChars: integer(env, 'DAYBREAK_IMESSAGE_MAX_REPLY_CHARS', 1_450, 500, 4_000),
    healthPort: integer(env, 'HEALTH_PORT', 8_787, 1_024, 65_535),
  };
}
