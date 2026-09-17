import 'server-only';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient, getCurrentPoint } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { solanaConnection } from '../client';

// Native on-curve BUY quote for a DBC pool (quote token -> base token). This is the
// "swap is native in our platform, not an offramp" path: the buy happens on Daybreak's
// own DBC pool, not by sending the user to another app.

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export interface DbcBuyQuote {
  pool: string;
  amountInQuote: string;   // base units of the quote token (e.g. USDC, 6 dp)
  amountOutBase: string;   // base units of the token being bought
  minimumAmountOut: string;
  feeQuote: string | null; // trading fee taken, in quote base units, if reported
  slippageBps: number;
}

// Quote a USDC->token buy on a live DBC pool. Requires the pool to already exist
// on-chain (a launched pool). Returns null-ish via thrown error if the pool is unknown.
export async function quoteDbcBuy(poolAddress: string, amountInQuote: string, slippageBps = 100): Promise<DbcBuyQuote> {
  if (!BASE58.test(poolAddress)) throw new Error('Invalid pool address');
  let amt: BN;
  try { amt = new BN(amountInQuote); } catch { throw new Error('Invalid amountInQuote'); }
  if (amt.lten(0)) throw new Error('amountInQuote must be positive');

  const conn = solanaConnection();
  const client = new DynamicBondingCurveClient(conn, 'confirmed');
  const pool = new PublicKey(poolAddress);
  const virtualPool = await client.state.getPool(pool);
  if (!virtualPool) throw new Error('Pool not found');
  // Anchor's generated types under-resolve these decoded accounts; fields below are
  // present at runtime per the program IDL. Cast narrowly for field access.
  const vp = virtualPool as unknown as { config: PublicKey };
  const config = await client.state.getPoolConfig(vp.config);
  if (!config) throw new Error('Pool config not found');
  const cfg = config as unknown as { activationType: number };
  const currentPoint = await getCurrentPoint(conn, cfg.activationType);

  const quote = client.pool.swapQuote({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    virtualPool: virtualPool as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: config as any,
    swapBaseForQuote: false, // false = quote -> base (buy the token)
    amountIn: amt,
    slippageBps,
    hasReferral: false,
    eligibleForFirstSwapWithMinFee: false,
    currentPoint,
  });
  const q = quote as unknown as { outputAmount: BN; minimumAmountOut: BN; tradingFee?: BN };

  return {
    pool: poolAddress,
    amountInQuote: amt.toString(),
    amountOutBase: q.outputAmount.toString(),
    minimumAmountOut: q.minimumAmountOut.toString(),
    feeQuote: q.tradingFee ? q.tradingFee.toString() : null,
    slippageBps,
  };
}
