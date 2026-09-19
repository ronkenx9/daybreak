import assert from 'node:assert/strict';
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import bs58 from 'bs58';
import { Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { decimalAmount, flashConfigured, flashOrderFields, flashOrders, flashPost, openIntent, sealIntent, verifyOrderSignature, verifySignedSetup } from '../lib/flash/stock-order.ts';

process.env.PRIVY_APP_SECRET = 'flash-test-secret-with-more-than-twenty-characters';
const originalFlashKey = process.env.DEFINITIVE_FLASH_API_KEY;
delete process.env.DEFINITIVE_FLASH_API_KEY;
assert.equal(flashConfigured(), false);
await assert.rejects(flashPost('/quote', {}), error => error.status === 503);
await assert.rejects(flashPost('/order', {}), error => error.status === 503);
await assert.rejects(flashOrders('test-wallet'), error => error.status === 503);
process.env.DEFINITIVE_FLASH_API_KEY = 'test-integrator-key';
assert.equal(flashConfigured(), true);
const originalFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = async (input, options) => {
  requests.push({ url: String(input), options });
  return Response.json(String(input).endsWith('/orders?funderAddress=test-wallet&pageSize=30') ? { orders: [] } : { quoteId: 'mock-quote' });
};
try {
  assert.equal((await flashPost('/quote', {})).quoteId, 'mock-quote');
  assert.deepEqual(await flashOrders('test-wallet'), []);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].options.headers['x-definitive-api-key'], 'test-integrator-key');
  assert.equal(requests[1].options.headers['x-definitive-api-key'], 'test-integrator-key');
} finally {
  globalThis.fetch = originalFetch;
}
if (originalFlashKey === undefined) delete process.env.DEFINITIVE_FLASH_API_KEY;
else process.env.DEFINITIVE_FLASH_API_KEY = originalFlashKey;
const wallet = Keypair.generate();
const otherWallet = Keypair.generate();
const mint = 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp';
const quoteId = 'q_test_bound_quote';
const intent = {
  version: 1, userId: 'test-user', thesisId: 'test-thesis', wallet: wallet.publicKey.toBase58(), mint,
  qty: '100.25', limitCrossPrice: '150', quoteId, orderMessage: `Buy ${mint} for up to 100.25 USDC`,
  nonce: '123', deadline: String(Math.floor(Date.now() / 1000) + 300),
  expireTime: new Date(Date.now() + 86_400_000).toISOString(), setupMessageHash: null, issuedAt: Date.now(),
};
assert.deepEqual(openIntent(sealIntent(intent)), intent);
const token = sealIntent(intent);
assert.throws(() => openIntent(`${token.slice(0, -2)}xx`), /changed|Invalid/);
assert.throws(() => openIntent(sealIntent({ ...intent, issuedAt: Date.now() - 11 * 60_000 })), /expired/);
assert.throws(() => openIntent(sealIntent({ ...intent, deadline: '1' })), /expired/);
assert.equal(decimalAmount('0.000001', 6, 10_000), '0.000001');
assert.equal(decimalAmount('100.250000', 6, 10_000), '100.25');
for (const value of ['0', '-1', '1e3', '10000.000001', '0.0000001']) assert.throws(() => decimalAmount(value, 6, 10_000));
assert.deepEqual(flashOrderFields(intent), {
  targetChain: 'solana', contraChain: 'solana', targetAsset: mint,
  contraAsset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', side: 'buy',
  qty: '100.25', orderType: 'limit', limitCrossPrice: '150', funderAddress: wallet.publicKey.toBase58(),
  maxSlippage: '0.01', maxPriceImpact: '0.05',
});

const seed = wallet.secretKey.subarray(0, 32);
const privateKey = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]), format: 'der', type: 'pkcs8' });
const signature = bs58.encode(sign(null, Buffer.from(intent.orderMessage), privateKey));
verifyOrderSignature(intent.orderMessage, signature, wallet.publicKey.toBase58());
assert.throws(() => verifyOrderSignature(`${intent.orderMessage}!`, signature, wallet.publicKey.toBase58()), /does not match/);
assert.throws(() => verifyOrderSignature(intent.orderMessage, signature, otherWallet.publicKey.toBase58()), /does not match/);

const tx = new Transaction({ feePayer: wallet.publicKey, recentBlockhash: Keypair.generate().publicKey.toBase58() }).add(
  SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: otherWallet.publicKey, lamports: 1 }),
);
const unsigned = tx.serialize({ requireAllSignatures: false }).toString('base64');
tx.sign(wallet);
const signed = tx.serialize().toString('base64');
verifySignedSetup(unsigned, signed, wallet.publicKey.toBase58());
assert.throws(() => verifySignedSetup(unsigned, signed, otherWallet.publicKey.toBase58()), /differs/);
const changed = Transaction.from(Buffer.from(signed, 'base64'));
changed.instructions[0].data[4] = 2;
assert.throws(() => verifySignedSetup(unsigned, changed.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'), wallet.publicKey.toBase58()), /differs/);

const quoteRoute = readFileSync(new URL('../app/api/theses/[id]/flash/quote/route.ts', import.meta.url), 'utf8');
const orderRoute = readFileSync(new URL('../app/api/theses/[id]/flash/order/route.ts', import.meta.url), 'utf8');
const setupRoute = readFileSync(new URL('../app/api/theses/[id]/flash/setup/route.ts', import.meta.url), 'utf8');
assert.match(quoteRoute, /forceMinimalAllowance: true/);
assert.match(quoteRoute, /requireUserOwningSolanaWallet/);
assert.match(quoteRoute, /requireThesisInstrument/);
assert.match(orderRoute, /verifyOrderSignature/);
assert.match(orderRoute, /getSignatureStatuses/);
assert.match(setupRoute, /if \(!flashConfigured\(\)\)/);
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
for (const file of ['lib/flash/stock-order.ts', 'flash/quote/route.ts', 'flash/setup/route.ts', 'flash/order/route.ts', 'flash/orders/route.ts', 'FlashStockOrder.tsx']) assert.ok(readme.includes(file));
assert.match(readme, /DEFINITIVE_FLASH_API_KEY/);
console.log('flash integration verification passed');
