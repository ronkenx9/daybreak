import { TOKENS } from '@/lib/base/tokens';

export type InstrumentNamespace = 'eip155:8453' | 'solana:mainnet';
export type CompanyClassification = 'public' | 'private';
export type CompanyNewsProvider = 'finnhub' | 'prestocks' | 'none';

export interface Company {
  id: string;
  symbol: string;
  name: string;
  classification: CompanyClassification;
  newsProvider: CompanyNewsProvider;
}

export interface CompanyInstrument {
  companyId: string;
  namespace: InstrumentNamespace;
  identity: string;
  symbol: string;
  decimals: number;
  issuer: 'coinbase' | 'xstocks' | 'prestocks';
  isin?: string;
  image?: string;
  externalUrl?: string;
  newsQuery?: string;
}

const COMPANY_IDS: Record<string, string> = {
  AAPL: 'apple', AMZN: 'amazon', GOOGL: 'alphabet', NVDA: 'nvidia',
  TSLA: 'tesla', META: 'meta', MSFT: 'microsoft', COIN: 'coinbase',
  CRCL: 'circle', INTC: 'intel', MSTR: 'microstrategy', SNDK: 'sandisk',
  SPCX: 'spacex',
};

const PUBLIC_COMPANIES: Company[] = TOKENS.filter((token) => token.ticker !== 'SPCX').map((token) => ({
  id: COMPANY_IDS[token.ticker],
  symbol: token.ticker,
  name: token.name,
  classification: 'public',
  newsProvider: 'finnhub',
}));

const PRIVATE_COMPANIES: Company[] = [
  { id: 'anduril', symbol: 'ANDURIL', name: 'Anduril', classification: 'private', newsProvider: 'prestocks' },
  { id: 'anthropic', symbol: 'ANTHROPIC', name: 'Anthropic', classification: 'private', newsProvider: 'prestocks' },
  { id: 'figure-ai', symbol: 'FIGUREAI', name: 'Figure AI', classification: 'private', newsProvider: 'prestocks' },
  { id: 'kalshi', symbol: 'KALSHI', name: 'Kalshi', classification: 'private', newsProvider: 'prestocks' },
  { id: 'neuralink', symbol: 'NEURALINK', name: 'Neuralink', classification: 'private', newsProvider: 'prestocks' },
  { id: 'openai', symbol: 'OPENAI', name: 'OpenAI', classification: 'private', newsProvider: 'prestocks' },
  { id: 'polymarket', symbol: 'POLYMARKET', name: 'Polymarket', classification: 'private', newsProvider: 'prestocks' },
  { id: 'spacex', symbol: 'SPACEX', name: 'SpaceX', classification: 'private', newsProvider: 'prestocks' },
];

export const COMPANIES: Company[] = [...PUBLIC_COMPANIES, ...PRIVATE_COMPANIES];

export const SOLANA_XSTOCK_INSTRUMENTS: CompanyInstrument[] = [
  { companyId: 'apple', namespace: 'solana:mainnet', identity: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp', symbol: 'AAPLx', decimals: 8, issuer: 'xstocks', isin: 'CH1436219187' },
  { companyId: 'amazon', namespace: 'solana:mainnet', identity: 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg', symbol: 'AMZNx', decimals: 8, issuer: 'xstocks', isin: 'CH1436219211' },
  { companyId: 'alphabet', namespace: 'solana:mainnet', identity: 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN', symbol: 'GOOGLx', decimals: 8, issuer: 'xstocks', isin: 'CH1436219237' },
  { companyId: 'nvidia', namespace: 'solana:mainnet', identity: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh', symbol: 'NVDAx', decimals: 8, issuer: 'xstocks', isin: 'CH1436219195' },
  { companyId: 'tesla', namespace: 'solana:mainnet', identity: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB', symbol: 'TSLAx', decimals: 8, issuer: 'xstocks', isin: 'CH1436219252' },
  { companyId: 'meta', namespace: 'solana:mainnet', identity: 'Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu', symbol: 'METAx', decimals: 8, issuer: 'xstocks', isin: 'CH1436219229' },
  { companyId: 'microsoft', namespace: 'solana:mainnet', identity: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX', symbol: 'MSFTx', decimals: 8, issuer: 'xstocks', isin: 'CH1436219203' },
  { companyId: 'coinbase', namespace: 'solana:mainnet', identity: 'Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu', symbol: 'COINx', decimals: 8, issuer: 'xstocks', isin: 'CH1436219708' },
  { companyId: 'intel', namespace: 'solana:mainnet', identity: 'XshPgPdXFRWB8tP1j82rebb2Q9rPgGX37RuqzohmArM', symbol: 'INTCx', decimals: 8, issuer: 'xstocks', isin: 'CH1436219609' },
  { companyId: 'microstrategy', namespace: 'solana:mainnet', identity: 'XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ', symbol: 'MSTRx', decimals: 8, issuer: 'xstocks', isin: 'CH1436219633' },
];

export const PRESTOCK_INSTRUMENTS: CompanyInstrument[] = [
  { companyId: 'anduril', namespace: 'solana:mainnet', identity: 'PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB', symbol: 'ANDURIL', decimals: 9, issuer: 'prestocks', image: 'https://www.prestocks.com/logos/anduril.png', externalUrl: 'https://www.prestocks.com/anduril', newsQuery: '"Anduril"' },
  { companyId: 'anthropic', namespace: 'solana:mainnet', identity: 'Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw', symbol: 'ANTHROPIC', decimals: 9, issuer: 'prestocks', image: 'https://www.prestocks.com/logos/anthropic.png', externalUrl: 'https://www.prestocks.com/anthropic', newsQuery: '"Anthropic"' },
  { companyId: 'figure-ai', namespace: 'solana:mainnet', identity: 'PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd', symbol: 'FIGUREAI', decimals: 9, issuer: 'prestocks', image: 'https://www.prestocks.com/logos/figureai.png', externalUrl: 'https://www.prestocks.com/figureai', newsQuery: '"Figure AI"' },
  { companyId: 'kalshi', namespace: 'solana:mainnet', identity: 'PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua', symbol: 'KALSHI', decimals: 9, issuer: 'prestocks', image: 'https://www.prestocks.com/logos/kalshi.png', externalUrl: 'https://www.prestocks.com/kalshi', newsQuery: '"Kalshi"' },
  { companyId: 'neuralink', namespace: 'solana:mainnet', identity: 'PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S', symbol: 'NEURALINK', decimals: 9, issuer: 'prestocks', image: 'https://www.prestocks.com/logos/neuralink.png', externalUrl: 'https://www.prestocks.com/neuralink', newsQuery: '"Neuralink"' },
  { companyId: 'openai', namespace: 'solana:mainnet', identity: 'PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF', symbol: 'OPENAI', decimals: 9, issuer: 'prestocks', image: 'https://www.prestocks.com/logos/openai.png', externalUrl: 'https://www.prestocks.com/openai', newsQuery: '"OpenAI"' },
  { companyId: 'polymarket', namespace: 'solana:mainnet', identity: 'Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP', symbol: 'POLYMARKET', decimals: 9, issuer: 'prestocks', image: 'https://www.prestocks.com/logos/polymarket.png', externalUrl: 'https://www.prestocks.com/polymarket', newsQuery: '"Polymarket"' },
  { companyId: 'spacex', namespace: 'solana:mainnet', identity: 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh', symbol: 'SPACEX', decimals: 9, issuer: 'prestocks', image: 'https://www.prestocks.com/logos/spacex.png', externalUrl: 'https://www.prestocks.com/spacex', newsQuery: '"SpaceX"' },
];

export const COMPANY_INSTRUMENTS: CompanyInstrument[] = [
  ...TOKENS.map((token) => ({
    companyId: COMPANY_IDS[token.ticker], namespace: 'eip155:8453' as const,
    identity: token.token.toLowerCase(), symbol: token.onchainSymbol,
    decimals: token.decimals, issuer: 'coinbase' as const,
  })),
  ...SOLANA_XSTOCK_INSTRUMENTS,
  ...PRESTOCK_INSTRUMENTS,
];

export const COMPANY_BY_ID: Record<string, Company> = Object.fromEntries(COMPANIES.map((company) => [company.id, company]));
const COMPANY_BY_SYMBOL: Record<string, Company> = Object.fromEntries([
  ...TOKENS.map((token) => [token.ticker, COMPANY_BY_ID[COMPANY_IDS[token.ticker]]]),
  ...PRESTOCK_INSTRUMENTS.map((instrument) => [instrument.symbol, COMPANY_BY_ID[instrument.companyId]]),
]);

export function companyForSymbol(symbol: string): Company | undefined {
  return COMPANY_BY_SYMBOL[symbol.toUpperCase()];
}

export function instrumentByIdentity(namespace: InstrumentNamespace, identity: string): CompanyInstrument | undefined {
  return COMPANY_INSTRUMENTS.find((instrument) => instrument.namespace === namespace && (
    namespace === 'eip155:8453' ? identity.toLowerCase() === instrument.identity : identity === instrument.identity
  ));
}

export function instrumentsForCompany(companyId: string): CompanyInstrument[] {
  return COMPANY_INSTRUMENTS.filter((instrument) => instrument.companyId === companyId);
}
