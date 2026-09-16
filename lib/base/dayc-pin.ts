import 'server-only';
import { getAddress, parseAbiItem, decodeEventLog } from 'viem';
import { baseClient } from './client';
import { DAYBREAK_TOKEN, DAYC_PIN_PRICE, DAYC_TREASURY, isPinSinkConfigured } from './daybreak-token';

const TRANSFER = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
const PIN_PRICE_RAW = BigInt(DAYC_PIN_PRICE) * 10n ** BigInt(DAYBREAK_TOKEN.decimals);
const MIN_CONFIRMATIONS = 2n;

export interface PinPaymentCheck { ok: boolean; reason?: string; amountRaw?: string }

// Verify on-chain that `txHash` is a confirmed DAYC transfer of at least the pin
// price, sent from one of the user's own wallets to the treasury. Read-only.
export async function verifyDaycPinPayment(txHash: string, ownedWallets: string[]): Promise<PinPaymentCheck> {
  if (!isPinSinkConfigured) return { ok: false, reason: 'Pinning is not available yet.' };
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { ok: false, reason: 'Invalid transaction hash' };
  const owners = new Set(ownedWallets.map((a) => a.toLowerCase()));
  const treasury = getAddress(DAYC_TREASURY).toLowerCase();
  const token = getAddress(DAYBREAK_TOKEN.address).toLowerCase();

  const receipt = await baseClient.getTransactionReceipt({ hash: txHash as `0x${string}` }).catch(() => null);
  if (!receipt) return { ok: false, reason: 'Payment not found yet. Try again in a moment.' };
  if (receipt.status !== 'success') return { ok: false, reason: 'Payment transaction failed' };

  const confirmations = await baseClient.getTransactionConfirmations({ hash: txHash as `0x${string}` }).catch(() => 0n);
  if (confirmations < MIN_CONFIRMATIONS) return { ok: false, reason: 'Payment is still confirming. Try again shortly.' };

  // Find a DAYC Transfer log from an owned wallet to the treasury of >= the price.
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== token) continue;
    let ev; try { ev = decodeEventLog({ abi: [TRANSFER], data: log.data, topics: log.topics }); } catch { continue; }
    if (ev.eventName !== 'Transfer') continue;
    const { from, to, value } = ev.args as { from: string; to: string; value: bigint };
    if (to.toLowerCase() !== treasury) continue;
    if (!owners.has(from.toLowerCase())) return { ok: false, reason: 'Payment was not sent from your wallet' };
    if (value < PIN_PRICE_RAW) return { ok: false, reason: 'Payment is below the pin price' };
    return { ok: true, amountRaw: value.toString() };
  }
  return { ok: false, reason: 'No DAYC payment to the treasury found in this transaction' };
}
