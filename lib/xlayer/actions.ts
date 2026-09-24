'use client';
import { encodeFunctionData, parseSignature } from 'viem';
import { XLAYER_VAULT_ADDRESS, vaultAbi } from './vault';
import type { XLayerStock } from './tokens';

// Client-side helpers for wallet-signed vault transactions. Every call goes through the
// account provider's guarded sender, which only allows the vault and verified xStocks.
type Account = {
  sendXLayerTransaction: (tx: { to: string; data: string }) => Promise<string>;
  signXLayerPermit: (p: { token: string; name: string; amount: string; nonce: string; deadline: string }) => Promise<string>;
};

export async function waitForXLayerReceipt(hash: string) {
  for (let i = 0; i < 45; i++) {
    const r = await fetch(`/api/xlayer/tx?hash=${hash}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
    if (r?.status === 'success') return;
    if (r?.status === 'reverted') throw new Error('The transaction reverted on X Layer. Nothing changed.');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Still pending on X Layer. Check the explorer before trying again.');
}

export function friendlyWalletError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return /reject|denied|cancel/i.test(message) ? 'You cancelled in your wallet. Nothing was sent.' : message;
}

export function openThesisTx(account: Account, stock: XLayerStock, uri: string, durationSeconds: number) {
  return account.sendXLayerTransaction({ to: XLAYER_VAULT_ADDRESS, data: encodeFunctionData({ abi: vaultAbi, functionName: 'openThesis', args: [stock.wrapper, true, BigInt(durationSeconds), uri] }) });
}

/** One permit signature (no gas) + one transaction. */
export async function backWithPermitTx(account: Account, stock: XLayerStock, owner: string, vaultThesisId: number, rawAmount: string, onSign?: () => void) {
  const info = await fetch(`/api/xlayer/permit?symbol=${stock.symbol}&owner=${owner}`, { cache: 'no-store' }).then((r) => r.ok ? r.json() : Promise.reject(new Error('X Layer is unavailable right now')));
  const deadline = String(Math.floor(Date.now() / 1000) + 30 * 60);
  const signature = await account.signXLayerPermit({ token: stock.token, name: info.name, amount: rawAmount, nonce: info.nonce, deadline });
  onSign?.();
  const { v, r, s, yParity } = parseSignature(signature as `0x${string}`);
  return account.sendXLayerTransaction({ to: XLAYER_VAULT_ADDRESS, data: encodeFunctionData({ abi: vaultAbi, functionName: 'backWithPermit', args: [BigInt(vaultThesisId), BigInt(rawAmount), BigInt(deadline), Number(v ?? BigInt(27 + (yParity ?? 0))), r, s] }) });
}

export function withdrawTx(account: Account, vaultThesisId: number) {
  return account.sendXLayerTransaction({ to: XLAYER_VAULT_ADDRESS, data: encodeFunctionData({ abi: vaultAbi, functionName: 'withdraw', args: [BigInt(vaultThesisId), true] }) });
}
