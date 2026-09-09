import 'server-only';
import { isBankrConfigured, BANKR_AUTH_MODE, BANKR_CHAIN, BASE_CHAIN_ID } from './config';

// Public capability flags contain no secrets. Discovery runs on Dexscreener;
// Bankr-backed preview and launch routes are available only when configured.
export interface BankrCapabilities {
  configured: boolean;
  authMode: BankrAuthModePublic;
  chain: string;
  chainId: number;
  discovery: boolean;
  quoting: boolean;
  trading: boolean;
  launches: boolean;
  launchFee: { allInPct: number; creatorPct: number }; // verified from docs
  launchSupply: number;
  notes: string[];
}
type BankrAuthModePublic = 'user' | 'partner' | 'none';

export function getCapabilities(): BankrCapabilities {
  return {
    configured: isBankrConfigured,
    authMode: BANKR_AUTH_MODE as BankrAuthModePublic,
    chain: BANKR_CHAIN,
    chainId: BASE_CHAIN_ID,
    discovery: true,
    quoting: isBankrConfigured,
    trading: false, // enable only after live wallet-mode proof
    launches: isBankrConfigured,
    launchFee: { allInPct: 1.75, creatorPct: 0.665 },
    launchSupply: 100_000_000_000,
    notes: [
      'Chain is always Base (8453); the provider default Robinhood chain is never used.',
      'Stock-paired community-token previews and launches are enabled when Bankr is configured. Every creator signs in with a verified wallet, previews first, and explicitly confirms deployment.',
    ],
  };
}
