import 'server-only';
import { decodeEventLog, parseAbiItem } from 'viem';
import { baseClient } from './client';
import { DAYC_TREASURY, isPinSinkConfigured } from './daybreak-token';

export const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const TRANSFER = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

export async function verifyCreditPayment(txHash: string, wallet: string, amountRaw: bigint, quoteCreatedAt: Date) {
  if (!isPinSinkConfigured) return { ok: false as const, reason: 'Payments are unavailable.' };
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { ok: false as const, reason: 'Invalid transaction hash.' };
  const hash = txHash.toLowerCase() as `0x${string}`;
  const receipt = await baseClient.getTransactionReceipt({ hash }).catch(() => null);
  if (!receipt) return { ok: false as const, reason: 'Payment is confirming. Retry with the same transaction.' };
  if (receipt.status !== 'success') return { ok: false as const, reason: 'Payment failed onchain.' };
  const confirmations = await baseClient.getTransactionConfirmations({ hash }).catch(() => 0n);
  if (confirmations < 2n) return { ok: false as const, reason: 'Payment needs two confirmations. Retry shortly.' };
  const block = await baseClient.getBlock({ blockNumber: receipt.blockNumber });
  if (Number(block.timestamp) * 1000 < quoteCreatedAt.getTime() - 60_000) return { ok: false as const, reason: 'This transaction predates the credit quote.' };
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== BASE_USDC.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: [TRANSFER], data: log.data, topics: log.topics });
      if (decoded.eventName !== 'Transfer') continue;
      const { from, to, value } = decoded.args as { from: string; to: string; value: bigint };
      if (from.toLowerCase() === wallet.toLowerCase() && to.toLowerCase() === DAYC_TREASURY.toLowerCase() && value === amountRaw) return { ok: true as const };
    } catch { /* not a Transfer event */ }
  }
  return { ok: false as const, reason: 'No exact USDC payment from your wallet to Daybreak was found.' };
}

// Operators must send the refund from the same published treasury to the
// original purchase wallet. This is read-only proof; the API never holds a key.
export async function verifyCreditRefund(txHash: string, wallet: string, amountRaw: bigint, requestCreatedAt: Date) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { ok: false as const, reason: 'Invalid refund transaction.' };
  const hash = txHash.toLowerCase() as `0x${string}`;
  const receipt = await baseClient.getTransactionReceipt({ hash }).catch(() => null);
  if (!receipt || receipt.status !== 'success') return { ok: false as const, reason: 'Refund transaction is not confirmed.' };
  if (await baseClient.getTransactionConfirmations({ hash }).catch(() => 0n) < 2n) return { ok: false as const, reason: 'Refund needs two confirmations.' };
  const block = await baseClient.getBlock({ blockNumber: receipt.blockNumber });
  if (Number(block.timestamp) * 1000 < requestCreatedAt.getTime() - 60_000) return { ok: false as const, reason: 'Refund predates the request.' };
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== BASE_USDC.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: [TRANSFER], data: log.data, topics: log.topics });
      if (decoded.eventName !== 'Transfer') continue;
      const { from, to, value } = decoded.args as { from: string; to: string; value: bigint };
      if (from.toLowerCase() === DAYC_TREASURY.toLowerCase() && to.toLowerCase() === wallet.toLowerCase() && value === amountRaw) return { ok: true as const };
    } catch { /* another event */ }
  }
  return { ok: false as const, reason: 'No exact treasury USDC refund to the original wallet was found.' };
}
