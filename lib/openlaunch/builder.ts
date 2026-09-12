import type { Address, Hex, PublicClient } from 'viem';

// Viem-side builder for openlaunch (Gitlawb) permissionless launches on Base / Robinhood Chain.
// The factory takes no fee and has no treasury: whoever builds the launch() call names up
// to 7 recipients (bps sum 10_000) fixed forever in the ownerless locker. Our monetization
// is a treasury recipient in that split — no custom hook required.
//
// Checklist item zero lives here too: never pass a counterfactual Safe address.
// Verify with verifySafe() (./safe) before calldata construction.

export const OPENLAUNCH_FACTORY: Record<number, Address> = {
  8453: '0x815542E8b392389A1389E22E588E4B62A67Ade72',
  4663: '0x815542E8b392389A1389E22E588E4B62A67Ade72',
};
export const TICK_SPACING = 200;
export const MAX_LP_FEE = 30_000; // 3% (10_000 = 1%)
export const SPLIT_BPS = 10_000;
export const MAX_RECIPIENTS = 7;
export const LAUNCH_TOKEN_DECIMALS = 18;

const FACTORY_ABI = [
  { name: 'findSalt', type: 'function', stateMutability: 'view', inputs: [{ name: 'launcher', type: 'address' }, { name: 'baseSalt', type: 'bytes32' }, { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'supply', type: 'uint256' }, { name: 'metadataURI', type: 'string' }, { name: 'quote', type: 'address' }, { name: 'maxTries', type: 'uint256' }], outputs: [{ name: 'salt', type: 'bytes32' }, { name: 'token', type: 'address' }] },
  { name: 'launch', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'p', type: 'tuple', components: [{ name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'metadataURI', type: 'string' }, { name: 'quote', type: 'address' }, { name: 'supply', type: 'uint256' }, { name: 'startTick', type: 'int24' }, { name: 'lpFee', type: 'uint24' }, { name: 'salt', type: 'bytes32' }, { name: 'recipients', type: 'tuple[]', components: [{ name: 'payout', type: 'address' }, { name: 'bps', type: 'uint16' }] }] }], outputs: [{ name: 'token', type: 'address' }, { name: 'tokenId', type: 'uint256' }] },
  { name: 'launchCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

export interface SplitEntry { payout: Address; bps: number }

// Contract price is 1.0001^tick raw token per raw quote. Convert a human price
// (quote tokens per 1 launched token) into raw units using both decimals,
// then snap to the tick grid.
export function tickForStartPrice(tokenPriceQuote: number, quoteDecimals: number, tokenDecimals = LAUNCH_TOKEN_DECIMALS): number {
  if (!Number.isFinite(tokenPriceQuote) || tokenPriceQuote <= 0) throw new Error('Start price must be positive');
  const raw = tokenPriceQuote * 10 ** (tokenDecimals - quoteDecimals);
  const tick = Math.round(Math.log(raw) / Math.log(1.0001) / TICK_SPACING) * TICK_SPACING;
  if (!Number.isSafeInteger(tick) || tick < -(2 ** 23) || tick > 2 ** 23 - 1) throw new Error('Start price out of tick range');
  return tick;
}

export function priceForTick(tick: number, quoteDecimals: number, tokenDecimals = LAUNCH_TOKEN_DECIMALS): number {
  return 1.0001 ** tick / 10 ** (tokenDecimals - quoteDecimals);
}

// Market cap (USD) + supply + quote USD price -> human quote-per-token start price.
export function marketCapToStartPrice(marketCapUsd: number, supplyHuman: number, quoteUsd: number): number {
  if (!(marketCapUsd > 0) || !(supplyHuman > 0) || !(quoteUsd > 0)) throw new Error('Market cap, supply and quote price must be positive');
  return marketCapUsd / supplyHuman / quoteUsd;
}

// Validate + normalize the immutable fee split. Sums to 10_000, max 7 entries.
export function encodeSplit(entries: SplitEntry[]): { payout: Address; bps: number }[] {
  if (entries.length < 1 || entries.length > MAX_RECIPIENTS) throw new Error(`Recipients must be 1–${MAX_RECIPIENTS}`);
  let total = 0;
  for (const e of entries) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(e.payout)) throw new Error(`Bad payout address ${e.payout}`);
    if (!Number.isInteger(e.bps) || e.bps < 0 || e.bps > SPLIT_BPS) throw new Error(`Bad bps for ${e.payout}`);
    total += e.bps;
  }
  if (total !== SPLIT_BPS) throw new Error(`Split must sum to ${SPLIT_BPS}, got ${total}`);
  return entries.map((e) => ({ payout: e.payout as Address, bps: e.bps }));
}

export interface LaunchBuild {
  name: string; symbol: string; metadataURI: string; quote: Address;
  supplyHuman: number; startTick: number; lpFee: number;
  recipients: SplitEntry[];
}

export function buildLaunchParams(b: LaunchBuild) {
  const name = b.name.trim().replace(/\s+/g, ' ');
  const symbol = b.symbol.trim().toUpperCase();
  if (name.length < 2 || name.length > 100) throw new Error('Token name must be 2–100 characters');
  if (!/^[A-Z0-9]{2,10}$/.test(symbol)) throw new Error('Symbol must be 2–10 letters or numbers');
  if (!/^https:\/\//.test(b.metadataURI) && !b.metadataURI.startsWith('ar://')) throw new Error('Metadata URI must be https:// or ar:// (Arweave, permanent — the URI is immutable)');
  if (!/^0x[a-fA-F0-9]{40}$/.test(b.quote)) throw new Error('Bad quote address');
  if (!(b.supplyHuman > 0) || !Number.isFinite(b.supplyHuman)) throw new Error('Supply must be positive');
  if (!Number.isInteger(b.startTick) || b.startTick % TICK_SPACING !== 0) throw new Error(`startTick must be a multiple of ${TICK_SPACING}`);
  if (!Number.isInteger(b.lpFee) || b.lpFee < 0 || b.lpFee > MAX_LP_FEE) throw new Error(`lpFee must be 0–${MAX_LP_FEE}`);
  const supply = BigInt(Math.floor(b.supplyHuman * 10 ** LAUNCH_TOKEN_DECIMALS));
  if (supply <= 0n) throw new Error('Supply must be positive');
  return {
    name, symbol, metadataURI: b.metadataURI, quote: b.quote as Address, supply,
    startTick: b.startTick, lpFee: b.lpFee, recipients: encodeSplit(b.recipients),
  };
}

export function randomBaseSalt(): Hex {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map((x) => x.toString(16).padStart(2, '0')).join('')}` as Hex;
}

// One view call: returns the salt whose predicted token sorts above the quote
// (required for ERC20 quotes) plus the predicted token address.
export async function findSalt(
  client: PublicClient, chainId: number, launcher: Address,
  args: { name: string; symbol: string; supply: bigint; metadataURI: string; quote: Address },
  maxTries = 256,
): Promise<{ salt: Hex; token: Address }> {
  const factory = OPENLAUNCH_FACTORY[chainId];
  if (!factory) throw new Error(`openlaunch not deployed on chain ${chainId}`);
  const [salt, token] = await client.readContract({
    address: factory, abi: FACTORY_ABI, functionName: 'findSalt',
    args: [launcher, randomBaseSalt(), args.name, args.symbol, args.supply, args.metadataURI, args.quote, BigInt(maxTries)],
  });
  return { salt: salt as Hex, token: token as Address };
}

export async function launchCount(client: PublicClient, chainId: number): Promise<bigint> {
  const factory = OPENLAUNCH_FACTORY[chainId];
  if (!factory) throw new Error(`openlaunch not deployed on chain ${chainId}`);
  return client.readContract({ address: factory, abi: FACTORY_ABI, functionName: 'launchCount' }) as Promise<bigint>;
}

export { FACTORY_ABI as OPENLAUNCH_FACTORY_ABI };
