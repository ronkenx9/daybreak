// Dedicated-wallet example. Dry run by default; never put the wallet file in a prompt.
import { createPrivateKey, randomUUID, sign } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { DaybreakAgentClient } from '../../packages/agent-sdk/index.mjs';

const client = new DaybreakAgentClient({ baseUrl: process.env.DAYBREAK_BASE_URL, apiKey: process.env.DAYBREAK_AGENT_API_KEY });
const execute = process.env.DAYBREAK_EXECUTE_FLASH === '1';
const capabilities = await client.capabilities();
const live = await client.theses({ mode: 'live' });
const thesisId = process.env.DAYBREAK_FLASH_THESIS_ID;
const thesis = live.items?.find(item => item.id === thesisId);
if (!execute) {
  console.log(JSON.stringify({ dryRun: true, flashAvailable: capabilities.operations?.flashLimitOrders === true, liveTheses: live.items?.length ?? 0, selectedThesis: thesis?.title ?? null, next: 'Set an exact thesis ID and DAYBREAK_EXECUTE_FLASH=1 only after reviewing a funded dedicated wallet and owner limits.' }));
  process.exit(0);
}
if (!capabilities.operations?.flashLimitOrders || !thesis) throw new Error('Flash unavailable or the selected Live thesis was not found');
if (!process.env.DAYBREAK_AGENT_API_KEY || !process.env.DAYBREAK_FLASH_AMOUNT_USDC || !process.env.DAYBREAK_FLASH_LIMIT_USDC || !process.env.DAYBREAK_SOLANA_KEYPAIR_FILE) throw new Error('Set the agent key, USDC amount, limit price, and dedicated wallet file');
const me = (await client.me()).agent;
const limits = await client.limits();
if (!me.scopes.includes('live:flash') || !me.policy.liveFlashEnabled || !me.policy.allowedInstrumentIds.includes(thesis.instrumentId)) throw new Error('The owner has not enabled this wallet and instrument for live Flash');
const file = process.env.DAYBREAK_SOLANA_KEYPAIR_FILE;
if ((statSync(file).mode & 0o077) !== 0) throw new Error('The dedicated wallet file must be readable only by its owner (chmod 600)');
const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(file, 'utf8'))));
if (keypair.publicKey.toBase58() !== me.policy.liveFlashWallet) throw new Error('The wallet file does not match the owner-bound Flash wallet');
const amount = process.env.DAYBREAK_FLASH_AMOUNT_USDC;
if (!(Number(amount) > 0) || Number(amount) > me.policy.liveFlashMaxUsdcPerOrder || Number(amount) + limits.flashUsage.reservedUsdc > me.policy.liveFlashDailyUsdc) throw new Error('The requested order exceeds live USDC limits');
const stateFile = '.daybreak/flash-agent-state.json';
if (existsSync(stateFile)) {
  const pending = JSON.parse(readFileSync(stateFile, 'utf8'));
  console.log(JSON.stringify({ stopped: 'Prior Flash submission state exists; inspect /flash/orders before another order.', pending, orders: await client.flashOrders() }));
  process.exit(0);
}
const quote = await client.quoteFlash({ thesisId: thesis.id, amount, limitPrice: process.env.DAYBREAK_FLASH_LIMIT_USDC });
console.log(JSON.stringify({ review: { thesis: thesis.title, stockMint: quote.stockMint, wallet: quote.wallet, spendUsdc: quote.spendUsdc, limitPrice: quote.limitPrice, estimatedReceive: quote.estimatedReceive, estimatedFeeUsd: quote.estimatedFeeUsd, setupRequired: Boolean(quote.setupTransactionBase64) } }));
let setup = {};
if (quote.setupTransactionBase64) {
  const tx = Transaction.from(Buffer.from(quote.setupTransactionBase64, 'base64'));
  tx.sign(keypair);
  const signedTransaction = tx.serialize().toString('base64');
  const result = await client.setupFlash({ review: quote.review, unsignedTransaction: quote.setupTransactionBase64, signedTransaction });
  setup = { setupSignature: result.signature, unsignedTransaction: quote.setupTransactionBase64, signedTransaction };
}
const seed = keypair.secretKey.subarray(0, 32);
const privateKey = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]), format: 'der', type: 'pkcs8' });
const userSignature = bs58.encode(sign(null, Buffer.from(quote.orderMessage, 'utf8'), privateKey));
const idempotencyKey = `flash:${randomUUID()}`;
mkdirSync('.daybreak', { recursive: true, mode: 0o700 });
writeFileSync(stateFile, JSON.stringify({ idempotencyKey, thesisId: thesis.id, wallet: quote.wallet, amount, createdAt: new Date().toISOString() }), { mode: 0o600, flag: 'wx' });
try {
  const result = await client.orderFlash({ review: quote.review, userSignature, ...setup }, idempotencyKey);
  console.log(JSON.stringify({ result, orders: await client.flashOrders() }));
} catch (error) {
  console.error('Submission outcome may be uncertain. State file kept; inspect /flash/orders and Flash before any new order.');
  throw error;
}
