const assert = require('node:assert/strict');
const path = require('node:path');
const { encodeEventTopics, encodeAbiParameters, parseAbiItem } = require('viem');
const { loader } = require('./test-paper-behavior.cjs');

const treasury = '0xbF676Ef8A8886cd217265fD534987344ea0cc84B';
const wallet = '0x1111111111111111111111111111111111111111';
const usdc = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const hash = `0x${'a'.repeat(64)}`;
const now = Math.floor(Date.now() / 1000);
let receiptStatus = 'success', confirmations = 2n, blockTime = now;
let log = transfer(wallet, treasury, 5_000_000n, usdc);
function transfer(from, to, value, address) {
  const event = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
  const topics = encodeEventTopics({ abi: [event], eventName: 'Transfer', args: { from, to } });
  const data = encodeAbiParameters([{ type: 'uint256' }], [value]);
  return { topics, data, address };
}
const baseClient = {
  getTransactionReceipt: async () => ({ status: receiptStatus, blockNumber: 100n, logs: [log] }),
  getTransactionConfirmations: async () => confirmations,
  getBlock: async () => ({ timestamp: BigInt(blockTime) }),
};
const payment = loader({
  [path.resolve('lib/base/client.ts')]: { baseClient },
  [path.resolve('lib/base/daybreak-token.ts')]: { DAYC_TREASURY: treasury, isPinSinkConfigured: true },
})('lib/base/economy-payment.ts');

(async () => {
  const created = new Date((now - 30) * 1000);
  assert.equal((await payment.verifyCreditPayment(hash, wallet, 5_000_000n, created)).ok, true);
  // A fixed USDC payment stays redeemable if confirmations finish later.
  assert.equal((await payment.verifyCreditPayment(hash, wallet, 5_000_000n, new Date((now - 30) * 1000))).ok, true);
  log = transfer('0x2222222222222222222222222222222222222222', treasury, 5_000_000n, usdc);
  assert.equal((await payment.verifyCreditPayment(hash, wallet, 5_000_000n, created)).ok, false);
  log = transfer(wallet, '0x3333333333333333333333333333333333333333', 5_000_000n, usdc);
  assert.equal((await payment.verifyCreditPayment(hash, wallet, 5_000_000n, created)).ok, false);
  log = transfer(wallet, treasury, 4_999_999n, usdc);
  assert.equal((await payment.verifyCreditPayment(hash, wallet, 5_000_000n, created)).ok, false);
  log = transfer(wallet, treasury, 5_000_000n, '0x4444444444444444444444444444444444444444');
  assert.equal((await payment.verifyCreditPayment(hash, wallet, 5_000_000n, created)).ok, false);
  log = transfer(wallet, treasury, 5_000_000n, usdc);
  blockTime = now - 120;
  assert.equal((await payment.verifyCreditPayment(hash, wallet, 5_000_000n, created)).ok, false);
  blockTime = now;
  confirmations = 1n;
  assert.equal((await payment.verifyCreditPayment(hash, wallet, 5_000_000n, created)).ok, false);
  confirmations = 2n;
  receiptStatus = 'reverted';
  assert.equal((await payment.verifyCreditPayment(hash, wallet, 5_000_000n, created)).ok, false);
  assert.equal((await payment.verifyCreditPayment('bad', wallet, 5_000_000n, created)).ok, false);
  console.log('ECONOMY_PAYMENT_OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
