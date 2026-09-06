import 'server-only';
import { isBankrConfigured, BANKR_AUTH_MODE, BANKR_CHAIN, BASE_CHAIN_ID } from './config';

// Public capability flags (no secrets). Trading and launches stay OFF until the
// live Phase 0 proofs land (wallet mode + stock allowlist). Discovery is on
// because it runs on Dexscreener, independent of Bankr credentials.
export interface BankrCapabilities {
  configured: boolean;
  authMode: BankrAuthModePublic;
  chain: string;
  chainId: number;
  discovery: boolean;
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
    trading: false, // enable only after live wallet-mode proof
    launches: false, // enable only after live stock-allowlist + wallet proof
    launchFee: { allInPct: 1.75, creatorPct: 0.665 },
    launchSupply: 100_000_000_000,
    notes: [
      'Chain is always Base (8453); the provider default Robinhood chain is never used.',
      'Trading and community-token launches remain disabled until Bankr wallet authority and the stock allowlist are proven with live credentials.',
    ],
  };
}
