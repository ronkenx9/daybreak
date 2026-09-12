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
// Uniswap v4 TickMath bounds, rounded inward to usable ticks for this pool's
// fixed spacing. int24 accepts a wider range that PoolManager cannot initialize.
export const MIN_START_TICK = Math.ceil(-887_272 / TICK_SPACING) * TICK_SPACING;
export const MAX_START_TICK = Math.floor(887_272 / TICK_SPACING) * TICK_SPACING;
export const MAX_LP_FEE = 30_000; // 3% (10_000 = 1%)
export const SPLIT_BPS = 10_000;
export const MAX_RECIPIENTS = 7;
export const LAUNCH_TOKEN_DECIMALS = 18;

const FACTORY_ABI = [
  { name: 'findSalt', type: 'function', stateMutability: 'view', inputs: [{ name: 'launcher', type: 'address' }, { name: 'baseSalt', type: 'bytes32' }, { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'supply', type: 'uint256' }, { name: 'metadataURI', type: 'string' }, { name: 'quote', type: 'address' }, { name: 'maxTries', type: 'uint256' }], outputs: [{ name: 'salt', type: 'bytes32' }, { name: 'token', type: 'address' }] },
  { name: 'launch', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'p', type: 'tuple', components: [{ name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'metadataURI', type: 'string' }, { name: 'quote', type: 'address' }, { name: 'supply', type: 'uint256' }, { name: 'startTick', type: 'int24' }, { name: 'lpFee', type: 'uint24' }, { name: 'salt', type: 'bytes32' }, { name: 'recipients', type: 'tuple[]', components: [{ name: 'payout', type: 'address' }, { name: 'bps', type: 'uint16' }] }] }], outputs: [{ name: 'token', type: 'address' }, { name: 'tokenId', type: 'uint256' }] },
  { name: 'launchCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;
const QUOTE_ABI = [{ name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] }] as const;

export interface SplitEntry { payout: Address; bps: number }

// Contract price is 1.0001^tick RAW TOKEN per RAW QUOTE. A human price is
// QUOTE per TOKEN, so raw token-per-quote is its RECIPROCAL scaled by decimals:
// 1 raw quote buys (1/P) human tokens = (1/P)*10^td raw tokens per 10^qd raw
// quote... i.e. raw = (1/P) * 10^(td-qd). Getting this backwards misprices by
// ~1/P^2 — verify against priceForTick, never trust a round-trip alone.
export function tickForStartPrice(tokenPriceQuote: number, quoteDecimals: number, tokenDecimals = LAUNCH_TOKEN_DECIMALS): number {
  if (!Number.isFinite(tokenPriceQuote) || tokenPriceQuote <= 0) throw new Error('Start price must be positive');
  const raw = (1 / tokenPriceQuote) * 10 ** (tokenDecimals - quoteDecimals);
  const tick = Math.round(Math.log(raw) / Math.log(1.0001) / TICK_SPACING) * TICK_SPACING;
  if (!Number.isSafeInteger(tick) || tick < MIN_START_TICK || tick > MAX_START_TICK) throw new Error('Start price out of pool tick range');
  return tick;
}

export function priceForTick(tick: number, quoteDecimals: number, tokenDecimals = LAUNCH_TOKEN_DECIMALS): number {
  const raw = 1.0001 ** tick; // raw token per raw quote
  return 1 / (raw / 10 ** (tokenDecimals - quoteDecimals)); // human quote per token
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
  supplyRaw: bigint; startTick: number; lpFee: number;
  recipients: SplitEntry[];
}

// Exact decimal-string -> raw bigint. Never route token amounts through floats:
// 1e9 * 1e18 overflows float precision and silently mints the wrong supply.
export function parseSupplyHuman(human: string, decimals = LAUNCH_TOKEN_DECIMALS): bigint {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(human.trim());
  if (!m) throw new Error('Supply must be a decimal number');
  const frac = (m[2] ?? '').slice(0, decimals).padEnd(decimals, '0');
  const raw = BigInt(m[1]) * 10n ** BigInt(decimals) + BigInt(frac || '0');
  if (raw <= 0n) throw new Error('Supply must be positive');
  return raw;
}

export function buildLaunchParams(b: LaunchBuild) {
  const name = b.name.trim().replace(/\s+/g, ' ');
  const symbol = b.symbol.trim().toUpperCase();
  if (name.length < 2 || name.length > 100) throw new Error('Token name must be 2–100 characters');
  if (!/^[A-Z0-9]{2,10}$/.test(symbol)) throw new Error('Symbol must be 2–10 letters or numbers');
  if (!/^https:\/\//.test(b.metadataURI) && !b.metadataURI.startsWith('ar://')) throw new Error('Metadata URI must be https:// or ar:// (Arweave, permanent — the URI is immutable)');
  if (!/^0x[a-fA-F0-9]{40}$/.test(b.quote)) throw new Error('Bad quote address');
  if (b.supplyRaw <= 0n) throw new Error('Supply must be positive');
  if (!Number.isInteger(b.startTick) || b.startTick % TICK_SPACING !== 0) throw new Error(`startTick must be a multiple of ${TICK_SPACING}`);
  if (b.startTick < MIN_START_TICK || b.startTick > MAX_START_TICK) throw new Error(`startTick must be between ${MIN_START_TICK} and ${MAX_START_TICK}`);
  if (!Number.isInteger(b.lpFee) || b.lpFee < 0 || b.lpFee > MAX_LP_FEE) throw new Error(`lpFee must be 0–${MAX_LP_FEE}`);
  const supply = b.supplyRaw;
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

// Enforced before salt search so an EOA, an undeployed address, or a token with
// unexpected units cannot make a launch transaction that is validly signed but
// economically misconfigured.
export async function verifyQuoteToken(client: PublicClient, chainId: number, quote: Address, expectedDecimals?: number): Promise<number> {
  if (!OPENLAUNCH_FACTORY[chainId]) throw new Error(`openlaunch not deployed on chain ${chainId}`);
  if (!/^0x[a-fA-F0-9]{40}$/.test(quote) || /^0x0{40}$/i.test(quote)) throw new Error('Bad quote address');
  const code = await client.getBytecode({ address: quote });
  if (!code || code === '0x') throw new Error('Quote token is not a deployed contract');
  const decimals = Number(await client.readContract({ address: quote, abi: QUOTE_ABI, functionName: 'decimals' }));
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('Quote token decimals are invalid');
  if (expectedDecimals !== undefined && decimals !== expectedDecimals) throw new Error(`Quote token decimals changed: expected ${expectedDecimals}, got ${decimals}`);
  return decimals;
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
  await verifyQuoteToken(client, chainId, args.quote);
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
