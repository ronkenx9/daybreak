export type Coverage = 'complete' | 'partial' | 'stale' | 'unavailable' | string;

export type ToolEnvelope<T> = {
  schemaVersion: string;
  requestId: string;
  fetchedAt: string;
  coverage: Coverage;
  data: T;
};

export type Instrument = {
  namespace: string;
  identity: string;
  symbol: string;
  decimals: number;
  issuer: string;
  externalUrl?: string;
};

export type Company = {
  id: string;
  symbol: string;
  name: string;
  classification: 'public' | 'private';
  newsProvider: string;
};

export type StockDiscovery = Company & {
  url: string;
  instruments: Instrument[];
};

export type MarketData = {
  company: string;
  kind: 'underlying_equity_reference_usd';
  price: string | null;
  source: string;
  asOf: string | null;
  stale: boolean;
  note: string;
};

export type Headline = {
  title?: string;
  source?: string;
  url?: string;
  seenAt?: string;
};

export type Circle = {
  name?: string;
  slug?: string;
  url?: string;
  memberCount?: number;
};

export type CompanyContext = {
  company: Company;
  circles: Circle[];
  headlines: Headline[];
  newsStatus: string;
  newsStale: boolean;
};

export type Thesis = {
  id: string;
  title: string;
  summary: string;
  companyId: string;
  instrumentId: string;
  tokenSymbol: string;
  mode: 'paper' | 'live';
  status: string;
  publishedAt?: string | null;
  authorKind?: 'human' | 'agent' | null;
  paperTradeCount?: number;
  url: string;
};

export type ThesisSearch = { items: Thesis[]; nextCursor: string | null };
