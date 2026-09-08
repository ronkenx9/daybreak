import { tokenForTicker } from '@/lib/base/tokens';
import { swapQuote, BankrHttpError } from '@/lib/bankr/client';
import { isBankrConfigured } from '@/lib/bankr/config';
import { createRateLimit } from '@/lib/server/requests';

export const dynamic = 'force-dynamic';

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const allowed = createRateLimit(40);

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function finite(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function POST(req: Request) {
  if (!allowed()) return Response.json({ error: 'Too many quote requests' }, { status: 429, headers: { 'Retry-After': '60' } });
  if (!isBankrConfigured) return Response.json({ error: 'Bankr quotes are not configured' }, { status: 503 });

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid quote request' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ error: 'Invalid quote request' }, { status: 400 });

  const input = body as Record<string, unknown>;
  const ticker = text(input.ticker).toUpperCase();
  const token = tokenForTicker(ticker);
  const amount = text(input.amount).trim();
  const amountNumber = Number(amount);

  if (!token) return Response.json({ error: 'Unsupported stock' }, { status: 400 });
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || !Number.isFinite(amountNumber) || amountNumber < 1 || amountNumber > 10_000) {
    return Response.json({ error: 'Enter a USDC amount from 1 to 10,000' }, { status: 400 });
  }

  try {
    const quote = await swapQuote({ fromToken: BASE_USDC, toToken: token.token, amount, slippageBps: 100 });
    if (!quote || typeof quote !== 'object' || !quote.from || !quote.to || !text(quote.minBuyAmount)) {
      return Response.json({ error: 'Bankr returned an incomplete quote' }, { status: 502 });
    }

    return Response.json({
      ticker: token.ticker,
      stockName: token.name,
      from: { symbol: text(quote.from.symbol), amount: text(quote.from.formattedAmount) },
      to: { symbol: text(quote.to.symbol), amount: text(quote.to.formattedAmount) },
      minimumReceived: text(quote.minBuyAmount),
      feeBps: finite(quote.feeBps),
      priceImpactBps: finite(quote.priceImpactBps),
      networkCostsUsd: finite(quote.networkCostsUsd),
      quoteId: text(quote.quoteId) ? 'available' : 'unavailable',
      executionEnabled: false,
      note: 'Live Bankr quote. Execution is disabled until the signed-in user has a verified Bankr execution wallet.',
    });
  } catch (error) {
    if (error instanceof BankrHttpError) {
      const status = error.status === 401 || error.status === 403 ? 503 : error.status;
      return Response.json({ error: status === 503 ? 'Bankr quoting is temporarily unavailable' : error.message }, { status });
    }
    return Response.json({ error: 'Bankr quoting is temporarily unavailable' }, { status: 503 });
  }
}
