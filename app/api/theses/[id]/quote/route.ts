import { randomUUID } from 'node:crypto';
import { Transaction } from '@solana/web3.js';
import { requireUserOwningSolanaWallet, readJsonObject, errorResponse, HttpError } from '@/lib/account/auth-server';
import { getPublicThesis, recordThesisTradePreview } from '@/lib/db/repo-theses';
import { buildThesisTradeTransaction, displayAmountToRaw, rawAmountToDisplay, type ThesisTradeDirection } from '@/lib/solana/dbc/trade';
import { thesisIntentHash, transactionMessageHash } from '@/lib/theses/model';
import { requireThesisInstrument } from '@/lib/theses/instruments';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: Context) {
  try {
    const body = await readJsonObject(request, 2_000);
    const wallet = typeof body.wallet === 'string' ? body.wallet : '';
    const { user, walletAddress } = await requireUserOwningSolanaWallet(request, wallet);
    const direction: ThesisTradeDirection = body.direction === 'sell' ? 'sell' : body.direction === 'buy' ? 'buy' : (() => { throw new HttpError(400, 'Direction must be buy or sell'); })();
    const amount = typeof body.amount === 'string' ? body.amount : '';
    const slippageBps = typeof body.slippageBps === 'number' ? body.slippageBps : 100;
    const { id } = await context.params;
    const thesis = await getPublicThesis(id);
    if (!thesis || thesis.marketStatus !== 'active') throw new HttpError(409, 'This thesis market is not open for bonding-curve trading');
    const instrument = requireThesisInstrument(thesis.instrumentId, direction);
    const inputDecimals = direction === 'buy' ? thesis.quoteDecimals : 6;
    const inputMint = direction === 'buy' ? thesis.quoteMint : thesis.baseMint;
    const amountRaw = await displayAmountToRaw(inputMint, amount, inputDecimals);
    const build = await buildThesisTradeTransaction({
      instrumentId: thesis.instrumentId, poolAddress: thesis.poolAddress, baseMint: thesis.baseMint,
      quoteMint: thesis.quoteMint, marketStatus: thesis.marketStatus,
    }, walletAddress, direction, amountRaw, slippageBps);
    const transaction = Transaction.from(Buffer.from(build.transactionBase64, 'base64'));
    const messageHash = transactionMessageHash(transaction.serializeMessage());
    const idempotencyKey = typeof body.idempotencyKey === 'string' && UUID.test(body.idempotencyKey) ? body.idempotencyKey : randomUUID();
    const intentHash = thesisIntentHash({ thesisId: thesis.id, walletAddress, direction, poolAddress: thesis.poolAddress, inputMint: build.inputMint, outputMint: build.outputMint, inputAmountRaw: build.inputAmountRaw, minimumOutputRaw: build.minimumOutputRaw, slippageBps, messageHash });
    const expiresAt = new Date(Date.now() + 90_000);
    const stored = await recordThesisTradePreview({
      thesisMarketId: thesis.marketId, userId: user.id, idempotencyKey, intentHash, walletAddress,
      direction, inputMint: build.inputMint, outputMint: build.outputMint, inputAmountRaw: build.inputAmountRaw,
      expectedOutputRaw: build.expectedOutputRaw, minimumOutputRaw: build.minimumOutputRaw,
      slippageBps, messageHash, recentBlockhash: build.recentBlockhash,
      lastValidBlockHeight: build.lastValidBlockHeight, expiresAt,
    });
    const inputSymbol = direction === 'buy' ? instrument.symbol : thesis.tokenSymbol;
    const [inputDisplay, expectedOutputDisplay, minimumOutputDisplay] = await Promise.all([
      rawAmountToDisplay(build.inputMint, build.inputAmountRaw),
      rawAmountToDisplay(build.outputMint, build.expectedOutputRaw),
      rawAmountToDisplay(build.outputMint, build.minimumOutputRaw),
    ]);
    return Response.json({
      quoteId: stored.id, idempotencyKey, intentHash, transactionBase64: build.transactionBase64,
      requiresSigner: build.requiresSigner, direction, phase: build.phase, poolAddress: build.poolAddress,
      input: { mint: build.inputMint, symbol: inputSymbol, decimals: build.inputDecimals, amountRaw: build.inputAmountRaw, amount: inputDisplay },
      expectedOutput: { mint: build.outputMint, symbol: direction === 'buy' ? thesis.tokenSymbol : instrument.symbol, decimals: build.outputDecimals, amountRaw: build.expectedOutputRaw, amount: expectedOutputDisplay },
      minimumOutput: { amountRaw: build.minimumOutputRaw, amount: minimumOutputDisplay },
      slippageBps, feeAmountRaw: build.feeAmountRaw, expiresAt: expiresAt.toISOString(),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_TRADE_INTENT') return errorResponse(new HttpError(409, 'This trade review was already created'));
    if (error instanceof Error && !('status' in error)) return errorResponse(new HttpError(400, error.message));
    return errorResponse(error);
  }
}
