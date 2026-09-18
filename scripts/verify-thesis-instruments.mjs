import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Connection, PublicKey } from '@solana/web3.js';
import { unpackMint, getTransferFeeConfig, getPausableConfig, getTransferHook, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { deriveTokenBadgeAddress, DYNAMIC_BONDING_CURVE_PROGRAM_ID } from '@meteora-ag/dynamic-bonding-curve-sdk';

const source = fs.readFileSync('lib/assets/companies.ts', 'utf8');
const instruments = [...source.matchAll(/identity: '([^']+)', symbol: '([^']+)', decimals: 8, issuer: 'xstocks'/g)]
  .map((match) => ({ mint: match[1], symbol: match[2] }));
assert.equal(instruments.length, 10, 'Expected the ten canonical Daybreak xStocks');
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
const mints = instruments.map(({ mint }) => new PublicKey(mint));
const badges = mints.map(deriveTokenBadgeAddress);
const accounts = await connection.getMultipleAccountsInfo([...mints, ...badges], 'confirmed');
const evidence = instruments.map((instrument, index) => {
  const account = accounts[index]; const badge = accounts[index + instruments.length];
  assert(account, `${instrument.symbol} mint missing`);
  const mint = unpackMint(mints[index], account, TOKEN_2022_PROGRAM_ID);
  const hook = getTransferHook(mint);
  const result = {
    ...instrument, decimals: mint.decimals, tokenProgram: account.owner.toBase58(),
    badge: badge ? badges[index].toBase58() : null, badgeOwner: badge?.owner.toBase58() ?? null,
    transferFee: Boolean(getTransferFeeConfig(mint)), paused: getPausableConfig(mint)?.paused ?? false,
    transferHookProgram: hook?.programId.toBase58() ?? null,
  };
  assert.equal(result.tokenProgram, TOKEN_2022_PROGRAM_ID.toBase58(), `${instrument.symbol} token program changed`);
  assert.equal(result.decimals, 8, `${instrument.symbol} decimals changed`);
  assert(result.badge, `${instrument.symbol} DBC badge missing`);
  assert.equal(result.badgeOwner, DYNAMIC_BONDING_CURVE_PROGRAM_ID.toBase58(), `${instrument.symbol} badge owner changed`);
  assert.equal(result.transferFee, false, `${instrument.symbol} transfer fee enabled`);
  assert.equal(result.paused, false, `${instrument.symbol} is paused`);
  assert.equal(result.transferHookProgram, PublicKey.default.toBase58(), `${instrument.symbol} transfer hook enabled`);
  return result;
});
console.log(JSON.stringify(evidence, null, 2));
console.log('all canonical xStocks pass thesis quote-token eligibility');
