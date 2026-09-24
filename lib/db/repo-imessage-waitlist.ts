import 'server-only';
import { getDb } from './client';
import { imessageWaitlist } from './schema';

export async function joinImessageWaitlist(phoneE164: string, source = 'web') {
  const [entry] = await getDb()
    .insert(imessageWaitlist)
    .values({ phoneE164, source, consentAt: new Date() })
    .onConflictDoUpdate({
      target: imessageWaitlist.phoneE164,
      set: { consentAt: new Date(), updatedAt: new Date() },
    })
    .returning({ status: imessageWaitlist.status, createdAt: imessageWaitlist.createdAt });
  return entry;
}
