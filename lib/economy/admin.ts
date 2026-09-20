import 'server-only';
import { HttpError, requireUser } from '@/lib/account/auth-server';

export async function requireEconomyAdmin(req: Request) {
  const user = await requireUser(req);
  const allowed = (process.env.DAYBREAK_ECONOMY_ADMIN_DIDS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!allowed.length || !allowed.includes(user.privyDid)) throw new HttpError(403, 'Economy operator access is not configured for this account.');
  return user;
}
