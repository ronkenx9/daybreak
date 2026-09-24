import 'server-only';
import { formatUnits } from 'viem';
import { xlayerClient } from './client';
import { XLAYER_STOCKS, XLAYER_STOCK_DECIMALS } from './tokens';
import { XLAYER_VAULT_ADDRESS, slugFromUri, vaultAbi, type VaultThesis } from './vault';

const wrapperAbi = [{ type: 'function', name: 'convertToAssets', stateMutability: 'view', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ type: 'uint256' }] }] as const;
const BY_WRAPPER = new Map(XLAYER_STOCKS.map((s) => [s.wrapper, s]));

/** Newest theses first. `backer` adds that wallet's locked position to each thesis. */
export async function readVaultTheses(backer: `0x${string}` | null, limit = 200): Promise<{ vault: string; blockNumber: string; theses: VaultThesis[] }> {
  if (!XLAYER_VAULT_ADDRESS) throw new Error('Vault not configured');
  const address = XLAYER_VAULT_ADDRESS as `0x${string}`;
  const blockNumber = await xlayerClient.getBlockNumber();
  const count = Number(await xlayerClient.readContract({ address, abi: vaultAbi, functionName: 'thesisCount', blockNumber }));
  const ids = Array.from({ length: Math.min(count, limit) }, (_, i) => BigInt(count - 1 - i));
  if (!ids.length) return { vault: address, blockNumber: blockNumber.toString(), theses: [] };
  const per = backer ? 3 : 2;
  const res = await xlayerClient.multicall({ blockNumber, allowFailure: false, contracts: ids.flatMap((id) => [
    { address, abi: vaultAbi, functionName: 'getThesis', args: [id] } as const,
    { address, abi: vaultAbi, functionName: 'lockedStock', args: [id] } as const,
    ...(backer ? [{ address, abi: vaultAbi, functionName: 'sharesOf', args: [id, backer] } as const] : []),
  ]) });
  const now = Math.floor(Date.now() / 1000);
  const rows = ids.map((id, i) => {
    const t = res[i * per] as { creator: string; wrapper: string; createdAt: bigint; expiresAt: bigint; bullish: boolean; backers: number; uri: string };
    const shares = backer ? (res[i * per + 2] as bigint) : null;
    return { id, t, locked: res[i * per + 1] as bigint, shares };
  });
  // Convert this wallet's wrapper shares to xStock units where it has a position.
  const held = rows.filter((r) => r.shares && r.shares > 0n);
  const converted = held.length ? await xlayerClient.multicall({ blockNumber, allowFailure: false, contracts: held.map((r) => ({ address: r.t.wrapper as `0x${string}`, abi: wrapperAbi, functionName: 'convertToAssets', args: [r.shares!] } as const)) }) : [];
  const stockFor = new Map(held.map((r, i) => [r.id, converted[i] as bigint]));
  const theses = rows.map(({ id, t, locked, shares }): VaultThesis => {
    const stock = BY_WRAPPER.get(t.wrapper.toLowerCase() as `0x${string}`);
    return {
      id: Number(id), creator: t.creator, wrapper: t.wrapper.toLowerCase(), ticker: stock?.ticker ?? null, symbol: stock?.symbol ?? null,
      bullish: t.bullish, statement: t.uri, thesisSlug: slugFromUri(t.uri), createdAt: Number(t.createdAt), expiresAt: Number(t.expiresAt), expired: now >= Number(t.expiresAt),
      backers: Number(t.backers), lockedStock: formatUnits(locked, XLAYER_STOCK_DECIMALS),
      yourShares: shares === null ? null : formatUnits(shares, XLAYER_STOCK_DECIMALS),
      yourStock: shares === null ? null : formatUnits(stockFor.get(id) ?? 0n, XLAYER_STOCK_DECIMALS),
    };
  });
  return { vault: address, blockNumber: blockNumber.toString(), theses };
}
