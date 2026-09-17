import 'server-only';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient, getPriceFromSqrtPrice, TokenDecimal } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { solanaConnection } from '../client';

// Issuer/monitoring view for a DBC pool: how far along the bonding curve is toward
// graduation, and the current on-curve price. This is the "tooling that helps issuers
// monitor DBC pools" the Meteora bounty asks for.

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export interface DbcPoolStatus {
  pool: string;
  baseMint: string;
  quoteMint: string;
  config: string;
  quoteReserve: string;        // quote token collected so far (base units)
  migrationThreshold: string;  // quote needed to graduate (base units)
  curveProgressPct: number;    // 0..100 toward graduation
  graduated: boolean;          // pool has migrated / completed the curve
  pricePerToken: string | null; // current on-curve price (quote per base), decimal string
}

export async function readDbcPoolStatus(poolAddress: string): Promise<DbcPoolStatus> {
  if (!BASE58.test(poolAddress)) throw new Error('Invalid pool address');
  const conn = solanaConnection();
  const client = new DynamicBondingCurveClient(conn, 'confirmed');
  const pool = new PublicKey(poolAddress);
  const virtualPool = await client.state.getPool(pool);
  if (!virtualPool) throw new Error('Pool not found');
  const config = await client.state.getPoolConfig((virtualPool as unknown as { config: PublicKey }).config);
  if (!config) throw new Error('Pool config not found');
  // Anchor's generated types under-resolve these decoded accounts; the fields below
  // are present at runtime per the program IDL. Cast narrowly for field access.
  const vp = virtualPool as unknown as { config: PublicKey; quoteReserve?: BN; sqrtPrice?: BN; baseMint?: PublicKey; isMigrated?: number | boolean };
  const cfg = config as unknown as { migrationQuoteThreshold?: BN; quoteMint?: PublicKey; tokenDecimal?: number };

  const quoteReserve = vp.quoteReserve?.toString?.() ?? '0';
  const migrationThreshold = cfg.migrationQuoteThreshold?.toString?.() ?? '0';
  // getPoolQuoteTokenCurveProgress returns fraction 0..1 toward the migration threshold.
  let progress = 0;
  try { progress = Number(await client.state.getPoolQuoteTokenCurveProgress(pool)); } catch { progress = 0; }
  const curveProgressPct = Math.max(0, Math.min(100, progress * 100));
  // isMigrated / curve completion: the pool exposes a flag; fall back to threshold reached.
  const graduated = Boolean(vp.isMigrated)
    || (migrationThreshold !== '0' && BigInt(quoteReserve) >= BigInt(migrationThreshold));

  let pricePerToken: string | null = null;
  try {
    if (vp.sqrtPrice) {
      const baseDec = (cfg.tokenDecimal ?? 9) as TokenDecimal;
      const p = getPriceFromSqrtPrice(vp.sqrtPrice, baseDec, TokenDecimal.SIX); // USDC-quoted
      pricePerToken = p.toString();
    }
  } catch { pricePerToken = null; }

  return {
    pool: poolAddress,
    baseMint: vp.baseMint?.toBase58?.() ?? '',
    quoteMint: cfg.quoteMint?.toBase58?.() ?? '',
    config: vp.config.toBase58(),
    quoteReserve, migrationThreshold, curveProgressPct, graduated, pricePerToken,
  };
}
