import { TOKENS } from '@/lib/base/tokens';

export type InstrumentNamespace = 'eip155:8453' | 'solana:mainnet';

export interface Company {
  id: string;
  ticker: string;
  name: string;
}

export interface CompanyInstrument {
  companyId: string;
  namespace: InstrumentNamespace;
  identity: string;
  symbol: string;
  decimals: number;
  isin?: string;
}

const COMPANY_IDS: Record<string, string> = {
  AAPL: 'apple', AMZN: 'amazon', GOOGL: 'alphabet', NVDA: 'nvidia',
  TSLA: 'tesla', META: 'meta', MSFT: 'microsoft', COIN: 'coinbase',
  CRCL: 'circle', INTC: 'intel', MSTR: 'microstrategy', SNDK: 'sandisk',
  SPCX: 'spacex',
};

export const COMPANIES: Company[] = TOKENS.map((token) => ({
  id: COMPANY_IDS[token.ticker], ticker: token.ticker, name: token.name,
}));

export const SOLANA_XSTOCK_INSTRUMENTS: CompanyInstrument[] = [
  { companyId: 'apple', namespace: 'solana:mainnet', identity: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp', symbol: 'AAPLx', decimals: 8, isin: 'CH1436219187' },
  { companyId: 'amazon', namespace: 'solana:mainnet', identity: 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg', symbol: 'AMZNx', decimals: 8, isin: 'CH1436219211' },
  { companyId: 'alphabet', namespace: 'solana:mainnet', identity: 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN', symbol: 'GOOGLx', decimals: 8, isin: 'CH1436219237' },
  { companyId: 'nvidia', namespace: 'solana:mainnet', identity: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh', symbol: 'NVDAx', decimals: 8, isin: 'CH1436219195' },
  { companyId: 'tesla', namespace: 'solana:mainnet', identity: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB', symbol: 'TSLAx', decimals: 8, isin: 'CH1436219252' },
  { companyId: 'meta', namespace: 'solana:mainnet', identity: 'Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu', symbol: 'METAx', decimals: 8, isin: 'CH1436219229' },
  { companyId: 'microsoft', namespace: 'solana:mainnet', identity: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX', symbol: 'MSFTx', decimals: 8, isin: 'CH1436219203' },
  { companyId: 'coinbase', namespace: 'solana:mainnet', identity: 'Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu', symbol: 'COINx', decimals: 8, isin: 'CH1436219708' },
  { companyId: 'intel', namespace: 'solana:mainnet', identity: 'XshPgPdXFRWB8tP1j82rebb2Q9rPgGX37RuqzohmArM', symbol: 'INTCx', decimals: 8, isin: 'CH1436219609' },
  { companyId: 'microstrategy', namespace: 'solana:mainnet', identity: 'XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ', symbol: 'MSTRx', decimals: 8, isin: 'CH1436219633' },
];

export const COMPANY_INSTRUMENTS: CompanyInstrument[] = [
  ...TOKENS.map((token) => ({
    companyId: COMPANY_IDS[token.ticker],
    namespace: 'eip155:8453' as const,
    identity: token.token.toLowerCase(),
    symbol: token.onchainSymbol,
    decimals: token.decimals,
  })),
  ...SOLANA_XSTOCK_INSTRUMENTS,
];

export const COMPANY_BY_ID: Record<string, Company> = Object.fromEntries(COMPANIES.map((company) => [company.id, company]));
export const COMPANY_BY_TICKER: Record<string, Company> = Object.fromEntries(COMPANIES.map((company) => [company.ticker, company]));

export function companyForTicker(ticker: string): Company | undefined {
  return COMPANY_BY_TICKER[ticker.toUpperCase()];
}

// Instrument identity is exact. EVM addresses are normalized because the chain
// treats address case as presentation; Solana mints remain case-sensitive.
export function instrumentByIdentity(namespace: InstrumentNamespace, identity: string): CompanyInstrument | undefined {
  return COMPANY_INSTRUMENTS.find((instrument) => instrument.namespace === namespace && (
    namespace === 'eip155:8453'
      ? identity.toLowerCase() === instrument.identity
      : identity === instrument.identity
  ));
}

export function instrumentsForCompany(companyId: string): CompanyInstrument[] {
  return COMPANY_INSTRUMENTS.filter((instrument) => instrument.companyId === companyId);
}
