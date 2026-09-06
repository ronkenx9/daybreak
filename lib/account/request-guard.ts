import 'server-only';
import { createKeyedRateLimit } from '@/lib/server/requests';
import { HttpError } from './auth-server';

const allowedWrite = createKeyedRateLimit(90, 60_000);

export function requireWriteCapacity(userId: string) {
  if (!allowedWrite(userId)) throw new HttpError(429, 'Too many account changes. Try again shortly.');
}
