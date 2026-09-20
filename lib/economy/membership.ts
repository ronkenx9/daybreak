import 'server-only';
import { requireUserWithWallet } from '@/lib/account/auth-server';
import { readDaycBalance, daycTier } from '@/lib/base/dayc-gate';

export async function researchMember(req: Request) {
  try {
    const { walletAddress } = await requireUserWithWallet(req);
    return daycTier(await readDaycBalance(walletAddress as `0x${string}`)) === 'member';
  } catch { return false; }
}
