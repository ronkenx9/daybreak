import { fetchUsdcToXstockQuote } from '@/lib/solana/jupiter';
import { rawToDecimal, tradeInstrumentsForTicker, type TradeQuote } from '@/lib/trading/model';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const ticker = (u.searchParams.get('ticker') || '').trim().toUpperCase();
  const usdc = Number(u.searchParams.get('usdc') || '10');
  if (!/^[A-Z]{1,6}$/.test(ticker)) return Response.json({ error: 'Invalid ticker' }, { status: 400 });
  if (!(usdc > 0) || usdc > 100_000) return Response.json({ error: 'Enter an amount between 0 and 100,000 USDC' }, { status: 400 });
  const quote = await fetchUsdcToXstockQuote(ticker, usdc);
  if (!quote) return Response.json({ error: 'No Solana route available right now' }, { status: 502 });
  const instrument = tradeInstrumentsForTicker(ticker).find((item) => item.issuer === 'xstocks');
  if (!instrument) return Response.json({ error: 'Instrument metadata is unavailable' }, { status: 502 });
  if (quote.inputMint !== instrument.funding.identity || quote.outputMint !== instrument.identity || quote.ticker !== instrument.ticker || quote.outputDecimals !== instrument.decimals || !/^\d+$/.test(quote.inputAmountRaw) || !/^\d+$/.test(quote.outputAmountRaw) || !/^\d+$/.test(quote.minimumOutputAmountRaw)) {
    return Response.json({ error: 'Jupiter returned a quote for a different asset' }, { status: 502 });
  }
  const normalized: TradeQuote = {
    contractVersion: 1, companyId: instrument.companyId, instrumentId: instrument.instrumentId,
    ticker: instrument.ticker, network: instrument.network, provider: 'jupiter', providerQuoteId: null,
    input: { assetId: quote.inputMint, symbol: 'USDC', decimals: 6, amount: String(quote.usdcIn), amountRaw: quote.inputAmountRaw },
    expectedOutput: { assetId: quote.outputMint, symbol: quote.xSymbol, decimals: quote.outputDecimals, amount: rawToDecimal(quote.outputAmountRaw, quote.outputDecimals) ?? String(quote.sharesOut), amountRaw: quote.outputAmountRaw },
    minimumOutput: { assetId: quote.outputMint, symbol: quote.xSymbol, decimals: quote.outputDecimals, amount: rawToDecimal(quote.minimumOutputAmountRaw, quote.outputDecimals) ?? String(quote.minSharesOut), amountRaw: quote.minimumOutputAmountRaw },
    fees: { providerBps: null, networkCostUsd: null, priceImpactPct: quote.priceImpactPct, slippageBps: quote.slippageBps },
    quotedAt: new Date().toISOString(), expiresAt: null,
    execution: { enabled: false, capability: 'quote_only', note: 'This Jupiter quote is for review only. Daybreak has not built or requested a transaction for your wallet.' },
  };
  return Response.json(normalized, { headers: { 'Cache-Control': 'no-store' } });
}
