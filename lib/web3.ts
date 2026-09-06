import { createPublicClient, http, formatUnits, parseUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { TradeQuote, TradeReceipt, Instrument } from './types';

export const baseClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

export const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

// 0x / Spender contract placeholder on Base
export const QUALIFIED_BASE_SPENDER: `0x${string}` =
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff';

/**
 * Generate a bounded quote for purchasing an instrument with USDC on Base.
 * Enforces integer arithmetic representation for atomic units.
 */
export function generateQuote(
  instrument: Instrument,
  usdAmountString: string
): TradeQuote {
  if (instrument.kind !== 'simulation') throw new Error('Only room simulations are supported here');
  const usdAmount = Number(usdAmountString);
  if (!Number.isFinite(usdAmount) || usdAmount <= 0) {
    throw new Error('Invalid purchase amount');
  }

  // USDC has 6 decimals
  const atomicInput = parseUnits(usdAmount.toFixed(6), 6).toString();

  // Price of 1 token share in USD
  const sharePrice = instrument.simulatedPriceUsd;
  const rawShares = usdAmount / sharePrice;
  const humanShares = rawShares.toFixed(4);

  // Scaled token output (18 decimals)
  const atomicOutput = parseUnits(rawShares.toFixed(6), 18).toString();

  const feeUsd = (Math.max(0.15, usdAmount * 0.0015)).toFixed(2);
  const estimatedGasUsd = '0.04'; // Typical Base L2 gas

  // 60-second quote validity
  const expiresAt = Date.now() + 60_000;

  return {
    id: `quote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    instrumentAddress: instrument.address,
    symbol: instrument.symbol,
    inputToken: 'USDC',
    inputAmount: usdAmount.toFixed(2),
    atomicInputAmount: atomicInput,
    expectedOutputShares: humanShares,
    atomicOutputAmount: atomicOutput,
    feeUsd,
    estimatedGasUsd,
    expiresAt,
    spender: QUALIFIED_BASE_SPENDER,
  };
}

/**
 * Executes or simulates the trade on Base.
 * In Fixture Mode, returns a generated sample receipt, not onchain evidence.
 * In Live Mode, fails closed until a real qualified integration exists.
 */
export async function executeTrade(
  quote: TradeQuote,
  networkMode: 'fixture' | 'live'
): Promise<TradeReceipt> {
  // Check if quote has expired
  if (Date.now() > quote.expiresAt) {
    throw new Error('Quote has expired. Please refresh and review a current quote.');
  }

  if (networkMode === 'fixture') {
    // Deterministic simulation delay to show authentic state transitions
    await new Promise((r) => setTimeout(r, 1600));

    const mockTxHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}` as `0x${string}`;

    return {
      id: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      txHash: mockTxHash,
      blockNumber: 21_490_820 + Math.floor(Math.random() * 100),
      timestamp: Date.now(),
      instrumentAddress: quote.instrumentAddress,
      symbol: quote.symbol,
      sharesPurchased: quote.expectedOutputShares,
      amountSpentUsd: quote.inputAmount,
      confirmedAt: Date.now(),
    };
  }

  throw new Error('Live trading is not connected. No transaction was sent. Use the clearly labeled simulation to preview the flow.');
}
