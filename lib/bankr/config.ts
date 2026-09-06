import 'server-only';

// Bankr credentials live only on the server. No key → the whole integration is
// inert (configured:false) and every call is refused. Never expose these.
export const BANKR_API_BASE = process.env.BANKR_API_BASE || 'https://api.bankr.bot';
export const BANKR_USER_KEY = process.env.BANKR_API_KEY || '';       // bk_usr_...
export const BANKR_PARTNER_KEY = process.env.BANKR_PARTNER_KEY || ''; // bk_ptr_...

export type BankrAuthMode = 'user' | 'partner' | 'none';
export const BANKR_AUTH_MODE: BankrAuthMode = BANKR_PARTNER_KEY ? 'partner' : BANKR_USER_KEY ? 'user' : 'none';
export const isBankrConfigured = BANKR_AUTH_MODE !== 'none';

// Daybreak is Base-only. Bankr's API defaults to Robinhood Chain (4663) when
// `chain` is omitted, which we must never accept — always send Base.
export const BANKR_CHAIN = 'base' as const;
export const BASE_CHAIN_ID = 8453;
