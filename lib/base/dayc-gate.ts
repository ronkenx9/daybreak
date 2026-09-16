import 'server-only';
import { baseClient } from './client';
import { b20Abi } from './abi';
import { DAYBREAK_TOKEN, DAYC_MEMBER_MIN } from './daybreak-token';

// Server-side $DAYC membership gate. Tier is binary; balances are never exposed
// to anyone but the wallet's own owner (the eligibility route proves ownership).
export type DaycTier = 'member' | 'none';

export const DAYC_MEMBER_MIN_RAW = BigInt(DAYC_MEMBER_MIN) * 10n ** BigInt(DAYBREAK_TOKEN.decimals);

export async function readDaycBalance(address: `0x${string}`): Promise<bigint> {
  return baseClient.readContract({
    address: DAYBREAK_TOKEN.address, abi: b20Abi, functionName: 'balanceOf', args: [address],
  }) as Promise<bigint>;
}

export function daycTier(raw: bigint): DaycTier {
  return raw >= DAYC_MEMBER_MIN_RAW ? 'member' : 'none';
}
