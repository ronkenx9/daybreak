import { createHash, randomBytes } from 'node:crypto';

export const AGENT_KEY_PREFIX = 'db_agent_';

export function agentKeyDigest(value: string, pepper = process.env.AGENT_API_KEY_PEPPER ?? '') {
  return createHash('sha256').update(`${pepper}:${value}`).digest('hex');
}
export function createAgentKey() {
  const prefix = randomBytes(6).toString('hex');
  const secret = randomBytes(32).toString('base64url');
  const value = `${AGENT_KEY_PREFIX}${prefix}_${secret}`;
  return { value, prefix, digest: agentKeyDigest(value) };
}

export function parseAgentKey(value: string) {
  const match = /^db_agent_([a-f0-9]{12})_([A-Za-z0-9_-]{40,60})$/.exec(value);
  return match ? { prefix: match[1], digest: agentKeyDigest(value) } : null;
}
