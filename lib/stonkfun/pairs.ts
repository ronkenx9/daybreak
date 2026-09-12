// Daybreak B20 ticker -> StonkFun xStocks quote symbol (verified live 2026-09-11;
// all launchable + LaunchLab-ready). Pair mints resolve at runtime via /pairs.
export const XSTOCK_QUOTE: Record<string, string> = {
  AAPL: 'APPLX', TSLA: 'TSLAX', NVDA: 'NVDAX', META: 'METAX', MSFT: 'MSFTX',
  COIN: 'COINX', CRCL: 'CRCLX', MSTR: 'MSTRX', AMZN: 'AMZNX', GOOGL: 'GOOGLX',
  INTC: 'INTCX', SNDK: 'SNDK', SPCX: 'SPCXX',
};

export function quoteSymbolFor(ticker: string): string | null {
  return XSTOCK_QUOTE[ticker] ?? null;
}
