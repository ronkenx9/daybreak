import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import {
  Connection, Keypair, PublicKey, SystemProgram,
} from '@solana/web3.js';
import {
  ExtensionType, TOKEN_2022_PROGRAM_ID, getExtensionTypes, getMint,
} from '@solana/spl-token';
import {
  ActivationType, BaseFeeMode, CollectFeeMode, DynamicBondingCurveClient,
  MigrationFeeOption, MigrationOption, TokenAuthorityOption, TokenDecimal,
  TokenType, buildCurveWithMarketCap, deriveTokenBadgeAddress,
} from '@meteora-ag/dynamic-bonding-curve-sdk';

nextEnv.loadEnvConfig(process.cwd());

const AAPLX_MINT = new PublicKey('XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp');
const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(rpcUrl, 'confirmed');
const client = DynamicBondingCurveClient.create(connection, 'confirmed');

function extensionNames(mint) {
  return getExtensionTypes(mint.tlvData).map((value) => ExtensionType[value] ?? String(value));
}

async function inspectMint() {
  const account = await connection.getAccountInfo(AAPLX_MINT, 'confirmed');
  assert(account, 'AAPLx mint account was not found');
  assert(account.owner.equals(TOKEN_2022_PROGRAM_ID), 'AAPLx is no longer owned by Token-2022');
  const mint = await getMint(connection, AAPLX_MINT, 'confirmed', TOKEN_2022_PROGRAM_ID);
  assert.equal(mint.decimals, 8, 'AAPLx decimals changed');
  const badgeAddress = deriveTokenBadgeAddress(AAPLX_MINT);
  const badge = await client.state.getTokenBadge(AAPLX_MINT);
  return { mint, extensions: extensionNames(mint), badgeAddress, badge };
}

async function findFundedSimulationPayer() {
  const signatures = await connection.getSignaturesForAddress(AAPLX_MINT, { limit: 20 }, 'confirmed');
  for (const item of signatures) {
    const transaction = await connection.getParsedTransaction(item.signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    const first = transaction?.transaction.message.accountKeys[0];
    if (!first?.signer) continue;
    const payer = first.pubkey;
    const account = await connection.getAccountInfo(payer, 'confirmed');
    if (account?.owner.equals(SystemProgram.programId) && account.lamports >= 100_000_000) return payer;
  }
  throw new Error('Could not locate a funded public mainnet account for signature-skipped simulation');
}

function stockQuoteCurve() {
  const curve = buildCurveWithMarketCap({
    token: {
      tokenType: TokenType.Token2022,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: TokenDecimal.EIGHT,
      tokenAuthorityOption: TokenAuthorityOption.CreatorUpdateAuthority,
      totalTokenSupply: 1_000_000_000,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerExponential,
        feeSchedulerParam: { startingFeeBps: 500, endingFeeBps: 100, numberOfPeriod: 120, totalDuration: 3600 },
      },
      dynamicFeeEnabled: true,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 50,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.FixedBps100,
      migrationFee: { feePercentage: 1, creatorFeePercentage: 50 },
    },
    liquidityDistribution: {
      partnerPermanentLockedLiquidityPercentage: 0,
      partnerLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 10,
      creatorLiquidityPercentage: 90,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0, numberOfVestingPeriod: 0, cliffUnlockAmount: 0,
      totalVestingDuration: 0, cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
    initialMarketCap: 10_000,
    migrationMarketCap: 100_000,
  });
  // The SDK's fixed-supply output does not include the protocol's swap buffer.
  // Use DBC's native dynamic-supply mode so this test isolates quote-mint support.
  return { ...curve, tokenSupply: null };
}

async function simulateStockQuote(info) {
  const payer = await findFundedSimulationPayer();
  const config = Keypair.generate();
  const baseMint = Keypair.generate();
  const transaction = await client.partner.createConfigAndPool({
    config: config.publicKey,
    feeClaimer: payer,
    leftoverReceiver: payer,
    quoteMint: AAPLX_MINT,
    payer,
    tokenBadge: info.badge ? info.badgeAddress : undefined,
    ...stockQuoteCurve(),
    preCreatePoolParam: {
      name: 'Daybreak Apple Thesis', symbol: 'AAPLTH',
      uri: 'https://www.daybreakcircles.lol', poolCreator: payer, baseMint: baseMint.publicKey,
    },
  });
  transaction.feePayer = payer;
  transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
  transaction.partialSign(config, baseMint);
  const result = await connection.simulateTransaction(transaction);
  return { payer, result: result.value };
}

const mode = process.argv[2] || '--simulate';
const info = await inspectMint();
console.log(JSON.stringify({
  network: 'solana-mainnet', ticker: 'AAPLx', mint: AAPLX_MINT.toBase58(),
  tokenProgram: 'Token-2022', decimals: info.mint.decimals,
  extensions: info.extensions, tokenBadge: info.badge ? info.badgeAddress.toBase58() : null,
}, null, 2));

if (mode === '--inspect') {
  console.log('AAPLx stock-mint inspection complete');
} else if (mode === '--simulate') {
  const { result } = await simulateStockQuote(info);
  const logs = result.logs ?? [];
  const verdict = result.err === null ? 'compatible' : 'incompatible';
  console.log(JSON.stringify({ verdict, error: result.err, unitsConsumed: result.unitsConsumed, logs: logs.slice(-12) }, null, 2));
  console.log(`DBC AAPLx quote compatibility verdict: ${verdict}`);
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
