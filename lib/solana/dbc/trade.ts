import 'server-only';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient, SwapMode, getCurrentPoint } from '@meteora-ag/dynamic-bonding-curve-sdk';
import {
  amountToUiAmountForMintWithoutSimulation,
  getMint,
  getPausableConfig,
  getTransferFeeConfig,
  getTransferHook,
  TOKEN_2022_PROGRAM_ID,
  uiAmountToAmountForMintWithoutSimulation,
} from '@solana/spl-token';
import { solanaConnection } from '../client';
import { requireThesisInstrument } from '@/lib/theses/instruments';

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const DEFAULT_PUBLIC_KEY = PublicKey.default.toBase58();

export type ThesisTradeDirection = 'buy' | 'sell';
export interface ThesisMarketIdentity { instrumentId: string; poolAddress: string; baseMint: string; quoteMint: string; marketStatus: string }
export interface ThesisTradeQuote {
  direction: ThesisTradeDirection; poolAddress: string; inputMint: string; outputMint: string;
  inputDecimals: number; outputDecimals: number; inputAmountRaw: string; expectedOutputRaw: string;
  minimumOutputRaw: string; slippageBps: number; feeAmountRaw: string | null; phase: 'bonding_curve';
}
export interface ThesisTradeBuild extends ThesisTradeQuote {
  transactionBase64: string; requiresSigner: string; recentBlockhash: string; lastValidBlockHeight: number;
}

function rawAmount(value: string) {
  if (!/^[1-9][0-9]{0,29}$/.test(value)) throw new Error('Amount must be a positive raw integer');
  return new BN(value);
}

function validateDisplayAmount(value: string, decimals: number): string {
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) throw new Error('Enter a valid amount');
  const [whole, fraction = ''] = value.trim().split('.');
  if (fraction.length > decimals) throw new Error(`Amount supports at most ${decimals} decimal places`);
  if (!/[1-9]/.test(`${whole}${fraction}`)) throw new Error('Amount must be greater than zero');
  return value.trim();
}

// xStocks use Token-2022 Scaled UI Amount. Always ask the live mint to map
// between the quantity shown to a person and the raw units used by Meteora.
// This also handles ordinary thesis-token mints without a special case.
export async function displayAmountToRaw(mintAddress: string, value: string, decimals: number): Promise<string> {
  const displayAmount = validateDisplayAmount(value, decimals);
  const amount = await uiAmountToAmountForMintWithoutSimulation(solanaConnection(), new PublicKey(mintAddress), displayAmount);
  if (amount <= 0n) throw new Error('Amount is too small at the current stock-token multiplier');
  return amount.toString();
}

export async function rawAmountToDisplay(mintAddress: string, value: string): Promise<string> {
  if (!/^\d+$/.test(value)) throw new Error('Invalid raw token amount');
  return amountToUiAmountForMintWithoutSimulation(solanaConnection(), new PublicKey(mintAddress), BigInt(value));
}

export async function assertThesisQuoteMintCompatible(quoteMint: PublicKey, expectedDecimals = 8) {
  const connection = solanaConnection();
  const mint = await getMint(connection, quoteMint, 'confirmed', TOKEN_2022_PROGRAM_ID);
  if (mint.decimals !== expectedDecimals) throw new Error('Stock-token decimals changed after eligibility review');
  if (getTransferFeeConfig(mint)) throw new Error('This stock token currently charges a transfer fee and cannot be traded safely in this market');
  if (getPausableConfig(mint)?.paused) throw new Error('This stock token is currently paused');
  const hook = getTransferHook(mint);
  if (hook && hook.programId.toBase58() !== DEFAULT_PUBLIC_KEY) throw new Error('This stock token currently requires an unverified transfer hook');
}

async function loadVerifiedMarket(identity: ThesisMarketIdentity, direction: ThesisTradeDirection) {
  if (![identity.poolAddress, identity.baseMint, identity.quoteMint].every((value) => BASE58.test(value))) throw new Error('Invalid thesis market identity');
  if (identity.marketStatus !== 'active') throw new Error('This thesis market is not in its bonding-curve trading phase');
  const instrument = requireThesisInstrument(identity.instrumentId, direction);
  if (instrument.mint !== identity.quoteMint) throw new Error('Stored stock-token mint does not match the instrument registry');
  const connection = solanaConnection();
  const client = DynamicBondingCurveClient.create(connection, 'confirmed');
  const poolAddress = new PublicKey(identity.poolAddress);
  const pool = await client.state.getPool(poolAddress);
  if (!pool) throw new Error('Thesis market pool was not found');
  const state = pool as unknown as { poolState: { config: PublicKey; baseMint: PublicKey; activationPoint: BN; isMigrated: number } };
  if (!state.poolState.baseMint.equals(new PublicKey(identity.baseMint))) throw new Error('Onchain thesis-token mint does not match the published market');
  if (state.poolState.isMigrated !== 0) throw new Error('This market has graduated; the bonding-curve route is closed');
  const config = await client.state.getPoolConfig(state.poolState.config);
  if (!config) throw new Error('Thesis market configuration was not found');
  const configState = config as unknown as { quoteMint: PublicKey; activationType: number };
  if (!configState.quoteMint.equals(new PublicKey(identity.quoteMint))) throw new Error('Onchain stock-token mint does not match the published market');
  const currentPoint = await getCurrentPoint(connection, configState.activationType);
  if (new BN(currentPoint).lt(new BN(state.poolState.activationPoint))) throw new Error('This thesis market is not active yet');
  await assertThesisQuoteMintCompatible(configState.quoteMint, instrument.decimals);
  return { connection, client, poolAddress, pool, config, currentPoint, instrument };
}

export async function quoteThesisTrade(identity: ThesisMarketIdentity, direction: ThesisTradeDirection, amountInRaw: string, slippageBps = 100): Promise<ThesisTradeQuote> {
  if (!Number.isInteger(slippageBps) || slippageBps < 10 || slippageBps > 500) throw new Error('Slippage must be between 0.1% and 5%');
  const amountIn = rawAmount(amountInRaw);
  const loaded = await loadVerifiedMarket(identity, direction);
  const quote = loaded.client.pool.swapQuote({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    virtualPool: loaded.pool as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: loaded.config as any,
    swapBaseForQuote: direction === 'sell', amountIn, slippageBps, hasReferral: false,
    eligibleForFirstSwapWithMinFee: false, currentPoint: loaded.currentPoint,
  });
  const result = quote as unknown as { outputAmount: BN; minimumAmountOut: BN; tradingFee?: BN };
  return {
    direction, poolAddress: identity.poolAddress,
    inputMint: direction === 'buy' ? identity.quoteMint : identity.baseMint,
    outputMint: direction === 'buy' ? identity.baseMint : identity.quoteMint,
    inputDecimals: direction === 'buy' ? loaded.instrument.decimals : 6,
    outputDecimals: direction === 'buy' ? 6 : loaded.instrument.decimals,
    inputAmountRaw: amountIn.toString(), expectedOutputRaw: result.outputAmount.toString(),
    minimumOutputRaw: result.minimumAmountOut.toString(), slippageBps,
    feeAmountRaw: result.tradingFee?.toString() ?? null, phase: 'bonding_curve',
  };
}

export async function buildThesisTradeTransaction(identity: ThesisMarketIdentity, ownerAddress: string, direction: ThesisTradeDirection, amountInRaw: string, slippageBps = 100): Promise<ThesisTradeBuild> {
  if (!BASE58.test(ownerAddress)) throw new Error('Invalid Solana wallet address');
  const quote = await quoteThesisTrade(identity, direction, amountInRaw, slippageBps);
  const connection = solanaConnection();
  const client = DynamicBondingCurveClient.create(connection, 'confirmed');
  const owner = new PublicKey(ownerAddress);
  const transaction = await client.pool.swap2({
    owner, payer: owner, pool: new PublicKey(identity.poolAddress), swapBaseForQuote: direction === 'sell',
    swapMode: SwapMode.ExactIn, amountIn: new BN(quote.inputAmountRaw), minimumAmountOut: new BN(quote.minimumOutputRaw),
    referralTokenAccount: null,
  });
  const blockhash = await connection.getLatestBlockhash('confirmed');
  transaction.feePayer = owner;
  transaction.recentBlockhash = blockhash.blockhash;
  return {
    ...quote,
    transactionBase64: Buffer.from(transaction.serialize({ requireAllSignatures: false, verifySignatures: false })).toString('base64'),
    requiresSigner: owner.toBase58(), recentBlockhash: blockhash.blockhash, lastValidBlockHeight: blockhash.lastValidBlockHeight,
  };
}
