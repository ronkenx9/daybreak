import 'server-only';
import { formatUnits } from 'viem';
import { xlayerClient } from './client';
import { wrapperAbi, xstockAbi } from './abi';
import { XLAYER_CHAIN_ID, XLAYER_STOCKS, XLAYER_STOCK_DECIMALS, xlayerExplorerUrl, type XLayerStock } from './tokens';

const ONE = 10n ** 18n;

export interface XLayerStockSupply {
  ticker: string; symbol: string; name: string; token: string; wrapper: string; explorerUrl: string;
  totalSupply: string | null; // rebased token units
  shares: string | null; // underlying shares represented (totalSupply / multiplier)
  multiplier: string | null;
  wrappedAssets: string | null; // token units held by the ERC-4626 wrapper
  paused: boolean | null;
  verified: boolean; // on-chain symbol and wrapper asset() matched the registry at this block
}

export interface XLayerHolding {
  ticker: string; symbol: string; name: string; token: string; wrapper: string;
  tokenBalance: string; // rebased xStock units held directly
  wrappedBalance: string; // wrapper shares held (wTSLAx)
  wrappedAsTokens: string; // wrapper shares converted to xStock units
  shares: string; // total underlying shares (direct + wrapped) after the multiplier
}

export interface XLayerSnapshot<T> {
  chainId: number; blockNumber: string; observedAt: number;
  status: 'complete' | 'partial'; failed: string[]; items: T[];
  gasBalanceOkb?: string | null; // holdings only: native OKB for gas, null if unreadable
}

function fmt(value: bigint): string { return formatUnits(value, XLAYER_STOCK_DECIMALS); }

export async function readXLayerSupply(stocks: XLayerStock[] = XLAYER_STOCKS): Promise<XLayerSnapshot<XLayerStockSupply>> {
  const blockNumber = await xlayerClient.getBlockNumber();
  const contracts = stocks.flatMap((s) => [
    { address: s.token, abi: xstockAbi, functionName: 'symbol' } as const,
    { address: s.token, abi: xstockAbi, functionName: 'totalSupply' } as const,
    { address: s.token, abi: xstockAbi, functionName: 'multiplier' } as const,
    { address: s.token, abi: xstockAbi, functionName: 'paused' } as const,
    { address: s.wrapper, abi: wrapperAbi, functionName: 'asset' } as const,
    { address: s.wrapper, abi: wrapperAbi, functionName: 'totalAssets' } as const,
  ]);
  const res = await xlayerClient.multicall({ contracts, blockNumber, allowFailure: true });
  const failed: string[] = [];
  const items = stocks.map((s, i): XLayerStockSupply => {
    const [sym, supply, mult, paused, asset, wrapped] = res.slice(i * 6, i * 6 + 6);
    const ok = <R,>(r: { status: string; result?: unknown } | undefined) => (r && r.status === 'success' ? r.result as R : null);
    const symbol = ok<string>(sym), total = ok<bigint>(supply), multiplier = ok<bigint>(mult), assetAddr = ok<string>(asset);
    const verified = symbol === s.symbol && typeof assetAddr === 'string' && assetAddr.toLowerCase() === s.token;
    if (!verified || total === null || !multiplier) failed.push(s.symbol);
    const usable = verified && total !== null && !!multiplier;
    const wrappedAssets = ok<bigint>(wrapped);
    return {
      ticker: s.ticker, symbol: s.symbol, name: s.name, token: s.token, wrapper: s.wrapper, explorerUrl: xlayerExplorerUrl(s.token),
      totalSupply: usable ? fmt(total!) : null,
      shares: usable ? fmt((total! * ONE) / multiplier!) : null,
      multiplier: usable ? fmt(multiplier!) : null,
      wrappedAssets: usable && wrappedAssets !== null ? fmt(wrappedAssets) : null,
      paused: ok<boolean>(paused),
      verified,
    };
  });
  if (failed.length === stocks.length) throw new Error('All X Layer supply reads failed');
  return { chainId: XLAYER_CHAIN_ID, blockNumber: blockNumber.toString(), observedAt: Date.now(), status: failed.length ? 'partial' : 'complete', failed, items };
}

export async function readXLayerHoldings(wallet: `0x${string}`): Promise<XLayerSnapshot<XLayerHolding>> {
  const blockNumber = await xlayerClient.getBlockNumber();
  const first = XLAYER_STOCKS.flatMap((s) => [
    { address: s.token, abi: xstockAbi, functionName: 'symbol' } as const,
    { address: s.token, abi: xstockAbi, functionName: 'balanceOf', args: [wallet] } as const,
    { address: s.token, abi: xstockAbi, functionName: 'multiplier' } as const,
    { address: s.wrapper, abi: wrapperAbi, functionName: 'balanceOf', args: [wallet] } as const,
  ]);
  const [res, gas] = await Promise.all([
    xlayerClient.multicall({ contracts: first, blockNumber, allowFailure: true }),
    xlayerClient.getBalance({ address: wallet, blockNumber }).catch(() => null),
  ]);
  const failed: string[] = [];
  const rows: { s: XLayerStock; bal: bigint; wbal: bigint; mult: bigint }[] = [];
  XLAYER_STOCKS.forEach((s, i) => {
    const [sym, bal, mult, wbal] = res.slice(i * 4, i * 4 + 4);
    if (sym?.status !== 'success' || sym.result !== s.symbol || bal?.status !== 'success' || mult?.status !== 'success' || wbal?.status !== 'success' || !(mult.result as bigint)) { failed.push(s.symbol); return; }
    const b = bal.result as bigint, w = wbal.result as bigint;
    if (b > 0n || w > 0n) rows.push({ s, bal: b, wbal: w, mult: mult.result as bigint });
  });
  if (failed.length === XLAYER_STOCKS.length) throw new Error('All X Layer holdings reads failed');
  // Convert wrapper shares to token units only for wallets that hold them.
  const wrappedRows = rows.filter((r) => r.wbal > 0n);
  const converted = wrappedRows.length
    ? await xlayerClient.multicall({ contracts: wrappedRows.map((r) => ({ address: r.s.wrapper, abi: wrapperAbi, functionName: 'convertToAssets', args: [r.wbal] } as const)), blockNumber, allowFailure: true })
    : [];
  const assetsFor = new Map<string, bigint>();
  wrappedRows.forEach((r, i) => {
    const c = converted[i];
    if (c?.status === 'success') assetsFor.set(r.s.symbol, c.result as bigint); else failed.push(`w${r.s.symbol}`);
  });
  const items = rows.filter((r) => r.wbal === 0n || assetsFor.has(r.s.symbol)).map((r): XLayerHolding => {
    const wrappedAsTokens = assetsFor.get(r.s.symbol) ?? 0n;
    return {
      ticker: r.s.ticker, symbol: r.s.symbol, name: r.s.name, token: r.s.token, wrapper: r.s.wrapper,
      tokenBalance: fmt(r.bal), wrappedBalance: fmt(r.wbal), wrappedAsTokens: fmt(wrappedAsTokens),
      shares: fmt(((r.bal + wrappedAsTokens) * ONE) / r.mult),
    };
  });
  return { chainId: XLAYER_CHAIN_ID, blockNumber: blockNumber.toString(), observedAt: Date.now(), status: failed.length ? 'partial' : 'complete', failed, items, gasBalanceOkb: gas === null ? null : formatUnits(gas, 18) };
}
