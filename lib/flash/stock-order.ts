import 'server-only';
import { createHmac, createPublicKey, timingSafeEqual, verify } from 'node:crypto';
import bs58 from 'bs58';
import { getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { HttpError } from '@/lib/account/auth-server';
import { solanaConnection } from '@/lib/solana/client';
import { USDC_SOLANA_MINT } from '@/lib/solana/xstocks-registry';

const BASE = 'https://flash.definitive.fi/v1';
const USDC = new PublicKey(USDC_SOLANA_MINT);
const DECIMAL = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,8})?$/;

export function flashConfigured(): boolean {
  return Boolean(process.env.DEFINITIVE_FLASH_API_KEY?.trim());
}

function flashApiKey(): string {
  const key = process.env.DEFINITIVE_FLASH_API_KEY?.trim();
  if (!key) throw new HttpError(503, 'Flash stock orders are not configured yet');
  return key;
}

export interface FlashIntent {
  version: 1; userId: string; thesisId: string; wallet: string; mint: string;
  actorId?: string; instrumentId?: string; policyVersion?: number;
  qty: string; limitCrossPrice: string; quoteId: string; orderMessage: string;
  nonce: string; deadline: string; expireTime: string; setupMessageHash: string | null; issuedAt: number;
}

export function decimalAmount(value: unknown, decimals: number, max: number): string {
  if (typeof value !== 'string' || !DECIMAL.test(value)) throw new HttpError(400, 'Enter a valid positive amount');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new HttpError(400, `Use at most ${decimals} decimal places`);
  const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0');
  if (units <= 0n || units > BigInt(max) * 10n ** BigInt(decimals)) throw new HttpError(400, `Amount must be between the smallest unit and ${max}`);
  return `${BigInt(whole)}${fraction ? `.${fraction.replace(/0+$/, '')}` : ''}`.replace(/\.$/, '');
}

function signingKey(): Buffer {
  const secret = process.env.PRIVY_APP_SECRET;
  if (!secret || secret.length < 20) throw new HttpError(503, 'Order reviews are unavailable');
  return createHmac('sha256', secret).update('daybreak-flash-intent-v1').digest();
}

export function sealIntent(intent: FlashIntent): string {
  const encoded = Buffer.from(JSON.stringify(intent)).toString('base64url');
  const mac = createHmac('sha256', signingKey()).update(encoded).digest('base64url');
  return `${encoded}.${mac}`;
}

export function openIntent(token: unknown): FlashIntent {
  if (typeof token !== 'string' || token.length > 12_000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new HttpError(400, 'Invalid order review');
  const [encoded, mac] = token.split('.');
  const expected = createHmac('sha256', signingKey()).update(encoded).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(mac, 'base64url'); } catch { throw new HttpError(400, 'Invalid order review'); }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new HttpError(400, 'Order review changed; request a new quote');
  let intent: FlashIntent;
  try { intent = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as FlashIntent; } catch { throw new HttpError(400, 'Invalid order review'); }
  if (intent.version !== 1 || !intent.quoteId || !intent.orderMessage || !intent.wallet || !intent.mint || !intent.nonce || !intent.deadline || !intent.expireTime || !Number.isFinite(intent.issuedAt)) throw new HttpError(400, 'Invalid order review');
  if (Date.now() - intent.issuedAt > 10 * 60_000 || intent.issuedAt > Date.now() + 30_000 || Number(intent.deadline) <= Date.now() / 1000) throw new HttpError(409, 'Order review expired; request a new quote');
  return intent;
}

export function flashOrderFields(intent: Pick<FlashIntent, 'wallet'|'mint'|'qty'|'limitCrossPrice'>) {
  return {
    targetChain: 'solana', contraChain: 'solana', targetAsset: intent.mint,
    contraAsset: USDC_SOLANA_MINT, side: 'buy', qty: intent.qty,
    orderType: 'limit', limitCrossPrice: intent.limitCrossPrice,
    funderAddress: intent.wallet, maxSlippage: '0.01', maxPriceImpact: '0.05',
  } as const;
}

export async function flashPost(path: '/quote' | '/order', payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const apiKey = flashApiKey();
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-definitive-api-key': apiKey },
      body: JSON.stringify(payload), cache: 'no-store', signal: AbortSignal.timeout(12_000),
    });
  } catch { throw new HttpError(503, 'Flash is temporarily unreachable'); }
  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const error = data?.error as { message?: unknown } | undefined;
    const message = typeof error?.message === 'string' ? error.message.slice(0, 180) : 'Flash could not price this stock pair';
    throw new HttpError(response.status === 429 ? 429 : 502, message);
  }
  if (!data || typeof data !== 'object') throw new HttpError(502, 'Flash returned an invalid response');
  return data;
}

export async function flashOrders(wallet: string): Promise<Record<string, unknown>[]> {
  const apiKey = flashApiKey();
  let response: Response;
  try {
    const url = new URL(`${BASE}/orders`);
    url.searchParams.set('funderAddress', wallet);
    url.searchParams.set('pageSize', '30');
    response = await fetch(url, { headers: { 'x-definitive-api-key': apiKey }, cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  } catch { throw new HttpError(503, 'Flash orders are temporarily unavailable'); }
  if (!response.ok) throw new HttpError(502, 'Flash orders are temporarily unavailable');
  const data = await response.json().catch(() => null) as { orders?: unknown } | null;
  if (!Array.isArray(data?.orders)) throw new HttpError(502, 'Flash returned an invalid order list');
  return data.orders.filter((order): order is Record<string, unknown> => Boolean(order && typeof order === 'object'));
}

type FlashIx = { programId: string; accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[]; data: string };
function validIx(value: unknown): value is FlashIx {
  if (!value || typeof value !== 'object') return false;
  const ix = value as Partial<FlashIx>;
  return typeof ix.programId === 'string' && typeof ix.data === 'string' && Array.isArray(ix.accounts) && ix.accounts.every(a => typeof a?.pubkey === 'string' && typeof a.isSigner === 'boolean' && typeof a.isWritable === 'boolean');
}
function toIx(ix: FlashIx): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: ix.accounts.map(a => ({ pubkey: new PublicKey(a.pubkey), isSigner: a.isSigner, isWritable: a.isWritable })),
    // Flash serializes Solana instruction data as base58, not base64.
    data: Buffer.from(bs58.decode(ix.data)),
  });
}

// Build a wallet-readable, narrowly scoped setup transaction from Flash's
// returned ATA/delegation instructions. Never relay arbitrary setupTxs.
export async function buildSetupTransaction(svm: Record<string, unknown>, wallet: string, targetMint: string, qty: string): Promise<string | null> {
  const owner = new PublicKey(wallet);
  const target = new PublicKey(targetMint);
  const ataRaw = svm.ataSetupIxs == null ? [] : svm.ataSetupIxs;
  if (!Array.isArray(ataRaw) || ataRaw.length > 2 || !ataRaw.every(validIx)) throw new HttpError(502, 'Flash returned unexpected token-account setup');
  const instructions: TransactionInstruction[] = [];
  const expectedAtas = new Set([
    getAssociatedTokenAddressSync(USDC, owner, false, TOKEN_PROGRAM_ID).toBase58(),
    getAssociatedTokenAddressSync(target, owner, false, TOKEN_2022_PROGRAM_ID).toBase58(),
  ]);
  for (const raw of ataRaw) {
    const ix = toIx(raw);
    const mint = ix.keys[3]?.pubkey.toBase58();
    const expectedProgram = mint === USDC_SOLANA_MINT ? TOKEN_PROGRAM_ID : mint === targetMint ? TOKEN_2022_PROGRAM_ID : null;
    if (!ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID) || ix.keys.length !== 6 || ix.data.length !== 1 || ix.data[0] !== 1 || !ix.keys[0]?.pubkey.equals(owner) || !ix.keys[2]?.pubkey.equals(owner) || !expectedAtas.has(ix.keys[1]?.pubkey.toBase58()) || !expectedProgram || !ix.keys[5]?.pubkey.equals(expectedProgram)) throw new HttpError(502, 'Flash requested unexpected account setup');
    instructions.push(ix);
  }
  if (svm.sponsoredDelegateTx) throw new HttpError(502, 'Flash sponsored delegation is not supported in this wallet flow');
  if (svm.delegateIx != null) {
    if (!validIx(svm.delegateIx)) throw new HttpError(502, 'Flash returned an invalid delegation');
    const ix = toIx(svm.delegateIx);
    const expectedSource = getAssociatedTokenAddressSync(USDC, owner, false, TOKEN_PROGRAM_ID);
    if (!ix.programId.equals(TOKEN_PROGRAM_ID) || ix.keys.length !== 3 || !ix.keys[0]?.pubkey.equals(expectedSource) || !ix.keys[2]?.pubkey.equals(owner)) throw new HttpError(502, 'Flash requested an unexpected delegation');
    const units = BigInt(qty.split('.')[0]) * 1_000_000n + BigInt((qty.split('.')[1] || '').padEnd(6, '0'));
    const data = ix.data;
    const delegated = data.length === 9 && data[0] === 4 ? data.readBigUInt64LE(1) : null;
    if (delegated === null || delegated <= 0n || delegated > units) throw new HttpError(502, 'Flash delegation exceeds the reviewed spend');
    instructions.push(ix);
  }
  if (!instructions.length) return null;
  const connection = solanaConnection();
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: owner, recentBlockhash: blockhash }).add(...instructions);
  return tx.serialize({ requireAllSignatures: false }).toString('base64');
}

export function verifySignedSetup(unsignedBase64: string, signedBase64: string, wallet: string): Transaction {
  let original: Transaction; let signed: Transaction;
  try {
    original = Transaction.from(Buffer.from(unsignedBase64, 'base64'));
    signed = Transaction.from(Buffer.from(signedBase64, 'base64'));
  } catch { throw new HttpError(400, 'Invalid setup transaction'); }
  if (signed.feePayer?.toBase58() !== wallet || !signed.serializeMessage().equals(original.serializeMessage()) || !signed.verifySignatures(true) || !signed.signature) throw new HttpError(400, 'Setup transaction differs from the reviewed instructions');
  return signed;
}

export function verifyOrderSignature(message: string, signature: string, wallet: string): void {
  let bytes: Uint8Array;
  try { bytes = bs58.decode(signature); } catch { throw new HttpError(400, 'Invalid order signature'); }
  if (bytes.length !== 64) throw new HttpError(400, 'Invalid order signature');
  // Ed25519 verification is also enforced by Flash at order admission.
  const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), new PublicKey(wallet).toBuffer()]), format: 'der', type: 'spki' });
  if (!verify(null, Buffer.from(message, 'utf8'), key, bytes)) throw new HttpError(400, 'Order signature does not match your wallet');
}
