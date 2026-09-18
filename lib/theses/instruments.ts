import 'server-only';
import { PublicKey } from '@solana/web3.js';
import { deriveTokenBadgeAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { COMPANY_BY_ID, SOLANA_XSTOCK_INSTRUMENTS } from '@/lib/assets/companies';

export const THESIS_MARKET_CONFIG_VERSION = 'stock-quote-v1' as const;

export type ThesisInstrumentStatus = 'creation_verified' | 'verification_pending' | 'unsupported';

export interface ThesisInstrument {
  id: string;
  companyId: string;
  companyName: string;
  ticker: string;
  symbol: string;
  namespace: 'solana:mainnet';
  mint: string;
  decimals: 8;
  issuer: 'xstocks';
  tokenProgram: 'token-2022';
  tokenBadge: string;
  status: ThesisInstrumentStatus;
  creationVerifiedAt: string | null;
  lifecycle: { create: boolean; buy: boolean; sell: boolean; graduate: boolean };
}

// All canonical Daybreak xStocks passed the same mainnet eligibility audit on
// 2026-09-18: Token-2022, 8 decimals, live DBC badge, unpaused, no transfer
// fee, and a disabled/default transfer hook. AAPLx additionally carries the
// representative non-broadcast createConfigAndPool simulation proof.
const XSTOCK_QUOTE_ELIGIBILITY_VERIFIED_AT = '2026-09-18';

export const THESIS_INSTRUMENTS: ThesisInstrument[] = SOLANA_XSTOCK_INSTRUMENTS.map((instrument) => {
  const company = COMPANY_BY_ID[instrument.companyId];
  if (!company || instrument.decimals !== 8 || instrument.issuer !== 'xstocks') {
    throw new Error(`Invalid thesis instrument source: ${instrument.identity}`);
  }
  const creationVerifiedAt = XSTOCK_QUOTE_ELIGIBILITY_VERIFIED_AT;
  return {
    id: `solana:${instrument.identity}`,
    companyId: instrument.companyId,
    companyName: company.name,
    ticker: company.symbol,
    symbol: instrument.symbol,
    namespace: 'solana:mainnet',
    mint: instrument.identity,
    decimals: 8,
    issuer: 'xstocks',
    tokenProgram: 'token-2022',
    tokenBadge: deriveTokenBadgeAddress(new PublicKey(instrument.identity)).toBase58(),
    status: 'creation_verified',
    creationVerifiedAt,
    lifecycle: { create: true, buy: true, sell: true, graduate: false },
  };
});

const BY_ID = new Map(THESIS_INSTRUMENTS.map((instrument) => [instrument.id, instrument]));

export function thesisInstrumentById(id: string): ThesisInstrument | undefined {
  return BY_ID.get(id);
}

export function requireThesisInstrument(id: string, capability: keyof ThesisInstrument['lifecycle'] = 'create'): ThesisInstrument {
  const instrument = thesisInstrumentById(id);
  if (!instrument) throw new Error('Unknown stock instrument');
  if (!instrument.lifecycle[capability]) throw new Error(`${instrument.symbol} thesis markets are still being verified for ${capability}`);
  return instrument;
}

export function publicThesisInstruments() {
  return THESIS_INSTRUMENTS.map(({ tokenBadge: _tokenBadge, ...instrument }) => instrument);
}
