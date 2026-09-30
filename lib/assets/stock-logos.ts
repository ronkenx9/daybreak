export type StockLogo = {
  src: string;
  tone?: 'dark';
  fit?: 'wide';
};

/**
 * Bundled company marks used by StockIcon. Keeping this registry explicit means
 * a newly listed stock cannot silently ship as a letter badge or broken image.
 */
export const STOCK_LOGOS: Record<string, StockLogo> = {
  AAPL: {src: '/assets/stock/AAPL.svg'},
  AMD: {src: '/assets/stock/AMD.png'},
  AMZN: {src: '/assets/stock/AMZN.svg'},
  ASTS: {src: '/assets/stock/ASTS.png', fit: 'wide'},
  AVGO: {src: '/assets/stock/AVGO.png'},
  BE: {src: '/assets/stock/BE.png'},
  CAKE: {src: '/assets/stock/CAKE.png', tone: 'dark', fit: 'wide'},
  COIN: {src: '/assets/stock/COIN.svg'},
  CRCL: {src: '/assets/stock/CRCL.svg'},
  DJT: {src: '/assets/stock/DJT.svg', fit: 'wide'},
  DKNG: {src: '/assets/stock/DKNG.png'},
  DUOL: {src: '/assets/stock/DUOL.png'},
  GME: {src: '/assets/stock/GME.png', tone: 'dark', fit: 'wide'},
  GOOGL: {src: '/assets/stock/GOOGL.svg'},
  HTZ: {src: '/assets/stock/HTZ.png', tone: 'dark', fit: 'wide'},
  INTC: {src: '/assets/stock/INTC.svg'},
  LLY: {src: '/assets/stock/LLY.png', fit: 'wide'},
  META: {src: '/assets/stock/META.svg'},
  MRNA: {src: '/assets/stock/MRNA.png'},
  MRVL: {src: '/assets/stock/MRVL.png', tone: 'dark'},
  MSFT: {src: '/assets/stock/MSFT.svg'},
  MSTR: {src: '/assets/stock/MSTR.svg'},
  MU: {src: '/assets/stock/MU.png'},
  NFLX: {src: '/assets/stock/NFLX.svg'},
  NVAX: {src: '/assets/stock/NVAX.png', tone: 'dark'},
  NVDA: {src: '/assets/stock/NVDA.svg'},
  ORCL: {src: '/assets/stock/ORCL.png', fit: 'wide'},
  PFE: {src: '/assets/stock/PFE.png', fit: 'wide'},
  PLTR: {src: '/assets/stock/PLTR.png', tone: 'dark'},
  PM: {src: '/assets/stock/PM.png', tone: 'dark'},
  PTON: {src: '/assets/stock/PTON.png'},
  PYPL: {src: '/assets/stock/PYPL.png'},
  QUBT: {src: '/assets/stock/QUBT.png', fit: 'wide'},
  RBLX: {src: '/assets/stock/RBLX.png', tone: 'dark'},
  RDDT: {src: '/assets/stock/RDDT.svg'},
  SBUX: {src: '/assets/stock/SBUX.svg'},
  SNDK: {src: '/assets/stock/SNDK.svg', fit: 'wide'},
  SONY: {src: '/assets/stock/SONY.svg'},
  SOUN: {src: '/assets/stock/SOUN.png'},
  SPCX: {src: '/assets/stock/SPCX.svg'},
  TSLA: {src: '/assets/stock/TSLA.svg'},
  TTWO: {src: '/assets/stock/TTWO.png', fit: 'wide'},
  WEN: {src: '/assets/stock/WEN.png'},
};

export function stockLogoFor(ticker: string): StockLogo | undefined {
  return STOCK_LOGOS[ticker.toUpperCase()];
}
