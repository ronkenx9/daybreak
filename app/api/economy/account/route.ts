import { errorResponse, requireUser } from '@/lib/account/auth-server';
import { getEconomyAccount, CREDIT_PACKS, CREDIT_PIN_PRICE } from '@/lib/db/repo-economy';

export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return Response.json({ ...(await getEconomyAccount(user.id)), packs: CREDIT_PACKS, pinPriceCents: CREDIT_PIN_PRICE }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return errorResponse(error); }
}
