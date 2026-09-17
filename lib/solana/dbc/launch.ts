import 'server-only';
import { Keypair, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient, deriveDbcPoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { solanaConnection } from '../client';
import { USDC_SOLANA_MINT } from '../xstocks-registry';
import { buildEquityCurve, equityMarketCaps } from './config';

// Build the DBC launch transaction for an equity-themed community token.
//
// The pool is created BY THE CREATOR: they are feeClaimer, leftoverReceiver, payer and
// poolCreator, and they sign as fee payer. The server generates the two ephemeral
// accounts a launch needs (the config account and the base mint), partial-signs with
// those, and hands back a base64 transaction for the creator to sign via Privy
// (signSolanaTransaction) and send. No server key ever holds funds.
//
// This is the intended launchpad design, not a workaround: the person launching the
// token is the one who pays rent and authorizes creation.

export interface LaunchInput {
  creator: string;             // creator wallet (base58) — pays + signs
  name: string;                // token name, e.g. "Nvidia Circle"
  symbol: string;              // token symbol, e.g. "NVDAC"
  uri: string;                 // metadata URI (image/json)
  referenceValuationUsd: number; // real reference valuation for the price band
  totalTokenSupply?: number;
}

export interface LaunchBuild {
  transactionBase64: string;   // partial-signed (config + mint); needs creator as fee payer
  poolAddress: string;
  configAddress: string;
  baseMint: string;
  quoteMint: string;
  band: { initialMarketCap: number; migrationMarketCap: number };
  requiresSigner: string;      // the creator must sign as fee payer
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function buildLaunchTransaction(input: LaunchInput): Promise<LaunchBuild> {
  if (!BASE58.test(input.creator)) throw new Error('Invalid creator address');
  const name = input.name.trim(); const symbol = input.symbol.trim().toUpperCase();
  if (!name || name.length > 32) throw new Error('name must be 1..32 chars');
  if (!symbol || symbol.length > 10) throw new Error('symbol must be 1..10 chars');
  try { new URL(input.uri); } catch { throw new Error('uri must be a valid URL'); }

  const creator = new PublicKey(input.creator);
  const quoteMint = new PublicKey(USDC_SOLANA_MINT);
  const configParams = buildEquityCurve({
    referenceValuationUsd: input.referenceValuationUsd,
    totalTokenSupply: input.totalTokenSupply,
    quoteDecimals: 6, // USDC
  });
  const band = equityMarketCaps(input.referenceValuationUsd);

  const conn = solanaConnection();
  const client = new DynamicBondingCurveClient(conn, 'confirmed');
  const config = Keypair.generate();
  const baseMint = Keypair.generate();

  const tx = await client.partner.createConfigAndPool({
    config: config.publicKey,
    feeClaimer: creator,
    leftoverReceiver: creator,
    quoteMint,
    payer: creator,
    ...configParams,
    preCreatePoolParam: {
      name, symbol, uri: input.uri, poolCreator: creator, baseMint: baseMint.publicKey,
    },
  });

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = creator;
  // Sign with the two ephemeral accounts we own; the creator signs as fee payer.
  tx.partialSign(config, baseMint);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  const poolAddress = deriveDbcPoolAddress(quoteMint, baseMint.publicKey, config.publicKey);
  return {
    transactionBase64: Buffer.from(serialized).toString('base64'),
    poolAddress: poolAddress.toBase58(),
    configAddress: config.publicKey.toBase58(),
    baseMint: baseMint.publicKey.toBase58(),
    quoteMint: quoteMint.toBase58(),
    band,
    requiresSigner: creator.toBase58(),
  };
}
