import 'server-only';
import { Keypair, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient, deriveDbcPoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { solanaConnection } from '../client';
import { buildThesisCurve } from './config';
import { assertThesisQuoteMintCompatible } from './trade';
import { requireThesisInstrument, type ThesisInstrument } from '@/lib/theses/instruments';

export interface ThesisLaunchInput {
  creator: string;
  instrumentId: string;
  name: string;
  symbol: string;
  uri: string;
}

export interface ThesisLaunchBuild {
  transactionBase64: string;
  poolAddress: string;
  configAddress: string;
  baseMint: string;
  quoteMint: string;
  tokenBadge: string;
  instrument: Pick<ThesisInstrument, 'id' | 'companyId' | 'companyName' | 'ticker' | 'symbol' | 'mint' | 'decimals'>;
  terms: ReturnType<typeof buildThesisCurve>['terms'];
  requiresSigner: string;
  lastValidBlockHeight: number;
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function buildThesisLaunchTransaction(input: ThesisLaunchInput): Promise<ThesisLaunchBuild> {
  if (!BASE58.test(input.creator)) throw new Error('Invalid creator address');
  const name = input.name.trim();
  const symbol = input.symbol.trim().toUpperCase();
  if (!name || name.length > 32) throw new Error('name must be 1..32 chars');
  if (!/^[A-Z0-9]{2,10}$/.test(symbol)) throw new Error('symbol must be 2..10 letters or numbers');
  let uri: URL;
  try { uri = new URL(input.uri); } catch { throw new Error('uri must be a valid URL'); }
  if (uri.protocol !== 'https:') throw new Error('uri must use https');

  const instrument = requireThesisInstrument(input.instrumentId, 'create');
  const creator = new PublicKey(input.creator);
  const quoteMint = new PublicKey(instrument.mint);
  const tokenBadge = new PublicKey(instrument.tokenBadge);
  const { config: configParams, terms } = buildThesisCurve({ quoteDecimals: instrument.decimals });
  const conn = solanaConnection();
  if (!await conn.getAccountInfo(tokenBadge, 'confirmed')) throw new Error(`${instrument.symbol} is missing its Meteora token badge`);
  await assertThesisQuoteMintCompatible(quoteMint, instrument.decimals);

  const client = DynamicBondingCurveClient.create(conn, 'confirmed');
  const config = Keypair.generate();
  const baseMint = Keypair.generate();
  const tx = await client.partner.createConfigAndPool({
    config: config.publicKey,
    feeClaimer: creator,
    leftoverReceiver: creator,
    quoteMint,
    tokenBadge,
    payer: creator,
    ...configParams,
    preCreatePoolParam: { name, symbol, uri: uri.toString(), poolCreator: creator, baseMint: baseMint.publicKey },
  });
  const blockhash = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash.blockhash;
  tx.feePayer = creator;
  tx.partialSign(config, baseMint);

  const poolAddress = deriveDbcPoolAddress(quoteMint, baseMint.publicKey, config.publicKey);
  return {
    transactionBase64: Buffer.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false })).toString('base64'),
    poolAddress: poolAddress.toBase58(),
    configAddress: config.publicKey.toBase58(),
    baseMint: baseMint.publicKey.toBase58(),
    quoteMint: quoteMint.toBase58(),
    tokenBadge: tokenBadge.toBase58(),
    instrument: {
      id: instrument.id, companyId: instrument.companyId, companyName: instrument.companyName,
      ticker: instrument.ticker, symbol: instrument.symbol, mint: instrument.mint, decimals: instrument.decimals,
    },
    terms,
    requiresSigner: creator.toBase58(),
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  };
}

// Compile-time bridge while the cutover leaf replaces the two legacy callers.
// It deliberately cannot build a USDC/reference-valuation launch.
export type LaunchBuild = ThesisLaunchBuild & { band: { initialMarketCap: number; migrationMarketCap: number } };
export async function buildLaunchTransaction(_legacyInput: unknown): Promise<LaunchBuild> {
  throw new Error('The legacy launcher is retired. Create a stock-paired thesis market.');
}
