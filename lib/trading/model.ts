import { companyForSymbol, instrumentsForCompany } from '@/lib/assets/companies';
import { XLAYER_STABLECOINS, XLAYER_STOCKS, XLAYER_STOCK_DECIMALS, xlayerExplorerUrl } from '@/lib/xlayer/tokens';

export type TradeNetwork = 'eip155:8453' | 'solana:mainnet' | 'eip155:196';
// 'none': no in-app quote yet (xStocks on X Layer are held and backed via the conviction vault).
export type QuoteProvider = 'bankr' | 'jupiter' | 'none';
export type ExecutionCapability = 'external_handoff' | 'quote_only';

export interface TradeInstrument {
  instrumentId: string;
  companyId: string;
  ticker: string;
  symbol: string;
  identity: string;
  decimals: number;
  issuer: 'coinbase' | 'xstocks';
  issuerLabel: string;
  network: TradeNetwork;
  networkLabel: string;
  productLabel: string;
  funding: { symbol: 'USDC'; identity: string; decimals: 6 };
  quoteProvider: QuoteProvider;
  explorerUrl: string;
}

export interface QuoteAmount {
  assetId: string;
  symbol: string;
  decimals: number;
  amount: string;
  amountRaw: string | null;
}

export interface TradeQuote {
  contractVersion: 1;
  companyId: string;
  instrumentId: string;
  ticker: string;
  network: TradeNetwork;
  provider: QuoteProvider;
  providerQuoteId: string | null;
  input: QuoteAmount;
  expectedOutput: QuoteAmount;
  minimumOutput: QuoteAmount;
  fees: { providerBps: number | null; networkCostUsd: number | null; priceImpactPct: number | null; slippageBps: number };
  quotedAt: string;
  expiresAt: string | null;
  execution: { enabled: false; capability: ExecutionCapability; note: string };
}

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export function tradeInstrumentsForTicker(ticker: string): TradeInstrument[] {
  const company = companyForSymbol(ticker);
  if (!company) return [];
  // X Layer first: it is the default instrument on a stock page.
  const xlayer = XLAYER_STOCKS.filter((stock) => stock.companyId === company.id).map((stock): TradeInstrument => ({
    instrumentId: `eip155:196:${stock.token}`,
    companyId: company.id,
    ticker: company.symbol,
    symbol: stock.symbol,
    identity: stock.token,
    decimals: XLAYER_STOCK_DECIMALS,
    issuer: 'xstocks',
    issuerLabel: 'Backed Finance',
    network: 'eip155:196',
    networkLabel: 'X Layer',
    productLabel: 'xStocks tracker certificate',
    funding: { symbol: 'USDC', identity: XLAYER_STABLECOINS.USDC, decimals: 6 },
    quoteProvider: 'none',
    explorerUrl: xlayerExplorerUrl(stock.token),
  }));
  return xlayer.concat(instrumentsForCompany(company.id).flatMap((instrument): TradeInstrument[] => {
    if (instrument.issuer === 'prestocks') return [];
    const base = instrument.namespace === 'eip155:8453';
    return [{
      instrumentId: `${instrument.namespace}:${instrument.identity}`,
      companyId: company.id,
      ticker: company.symbol,
      symbol: instrument.symbol,
      identity: instrument.identity,
      decimals: instrument.decimals,
      issuer: instrument.issuer,
      issuerLabel: base ? 'Coinbase' : 'Backed Finance',
      network: instrument.namespace,
      networkLabel: base ? 'Base' : 'Solana',
      productLabel: base ? 'Coinbase tokenized stock' : 'xStocks tracker certificate',
      funding: { symbol: 'USDC', identity: base ? BASE_USDC : SOLANA_USDC, decimals: 6 },
      quoteProvider: base ? 'bankr' : 'jupiter',
      explorerUrl: base ? `https://basescan.org/token/${instrument.identity}` : `https://solscan.io/token/${instrument.identity}`,
    }];
  }));
}

export function decimalToRaw(value: string, decimals: number): string | null {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30 || !/^\d+(?:\.\d+)?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals) return null;
  try { return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0')).toString(); }
  catch { return null; }
}

export function rawToDecimal(value: string, decimals: number, maxFraction = 8): string | null {
  if (!/^\d+$/.test(value) || !Number.isInteger(decimals) || decimals < 0 || decimals > 30) return null;
  const padded = value.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals || undefined);
  const fraction = decimals ? padded.slice(-decimals).slice(0, maxFraction).replace(/0+$/, '') : '';
  return fraction ? `${whole}.${fraction}` : whole;
}
