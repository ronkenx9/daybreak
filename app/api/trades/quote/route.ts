import { tokenForTicker } from '@/lib/base/tokens';
import { swapQuote, BankrHttpError } from '@/lib/bankr/client';
import { isBankrConfigured } from '@/lib/bankr/config';
import { createRateLimit } from '@/lib/server/requests';
import { decimalToRaw, rawToDecimal, tradeInstrumentsForTicker, type TradeQuote } from '@/lib/trading/model';

export const dynamic = 'force-dynamic';

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const allowed = createRateLimit(40);

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function finite(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function bounded(value: unknown, min: number, max: number) {
  const number = finite(value);
  return number != null && number >= min && number <= max ? number : null;
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
    if (text(quote.from.token).toLowerCase() !== BASE_USDC.toLowerCase() || text(quote.to.token).toLowerCase() !== token.token.toLowerCase()) {
      return Response.json({ error: 'Bankr returned a quote for a different asset' }, { status: 502 });
    }

    const instrument = tradeInstrumentsForTicker(token.ticker).find((item) => item.issuer === 'coinbase');
    if (!instrument) return Response.json({ error: 'Instrument metadata is unavailable' }, { status: 502 });
    const outputRaw = /^\d+$/.test(text(quote.to.amount)) ? text(quote.to.amount) : null;
    const minimumRaw = /^\d+$/.test(text(quote.minBuyAmount)) ? text(quote.minBuyAmount) : null;
    const minimumAmount = minimumRaw ? rawToDecimal(minimumRaw, instrument.decimals) : text(quote.minBuyAmount);
    const normalized: TradeQuote = {
      contractVersion: 1, companyId: instrument.companyId, instrumentId: instrument.instrumentId,
      ticker: instrument.ticker, network: instrument.network, provider: 'bankr',
      providerQuoteId: text(quote.quoteId) || null,
      input: { assetId: instrument.funding.identity, symbol: 'USDC', decimals: 6, amount: text(quote.from.formattedAmount) || amount, amountRaw: /^\d+$/.test(text(quote.from.amount)) ? text(quote.from.amount) : decimalToRaw(amount, 6) },
      expectedOutput: { assetId: instrument.identity, symbol: instrument.symbol, decimals: instrument.decimals, amount: text(quote.to.formattedAmount), amountRaw: outputRaw },
      minimumOutput: { assetId: instrument.identity, symbol: instrument.symbol, decimals: instrument.decimals, amount: minimumAmount || '', amountRaw: minimumRaw },
      fees: { providerBps: bounded(quote.feeBps, 0, 10_000), networkCostUsd: bounded(quote.networkCostsUsd, 0, 1_000_000), priceImpactPct: bounded(quote.priceImpactBps, -10_000, 10_000) == null ? null : bounded(quote.priceImpactBps, -10_000, 10_000)! / 10000, slippageBps: bounded(quote.slippageBps, 0, 2_000) ?? 100 },
      quotedAt: new Date().toISOString(), expiresAt: null,
      execution: { enabled: false, capability: 'external_handoff', note: 'This Bankr quote is for review only. Any external venue must produce its own fresh quote before you sign.' },
    };
    return Response.json(normalized, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof BankrHttpError) {
      const status = error.status === 401 || error.status === 403 ? 503 : error.status;
      return Response.json({ error: status === 503 ? 'Bankr quoting is temporarily unavailable' : error.message }, { status });
    }
    return Response.json({ error: 'Bankr quoting is temporarily unavailable' }, { status: 503 });
  }
}
