// Launch endpoint strategy (locked 2026-09-11):
// Bankr + StonkFun are user-selectable endpoints; monetization comes from Muse
// pull fees. Our own launcher (openlaunch builder in lib/openlaunch) ships later
// once attention justifies it. StonkFun is Solana-only and needs a Solana wallet
// system first — tracked, not started.
export type LaunchEndpointId = 'bankr' | 'stonkfun' | 'openlaunch';
export interface LaunchEndpoint {
  id: LaunchEndpointId; label: string; chains: string[];
  status: 'live' | 'needs-solana-wallet' | 'builder-ready' | 'untested';
  monetization: string; notes: string;
}
export const LAUNCH_ENDPOINTS: LaunchEndpoint[] = [
  {
    id: 'bankr', label: 'Bankr', chains: ['base'], status: 'live',
    monetization: 'None to us — creator fees go to the launching wallet.',
    notes: 'Current LaunchPortal path. Uniswap v4 stock-paired pools via API key.',
  },
  {
    id: 'stonkfun', label: 'StonkFun', chains: ['solana'], status: 'untested',
    monetization: 'None to us — creator keeps share, platform keeps 0.5%.',
    notes: 'Keyless API, 461 pairs, airdrop-to-holders mechanic. Solana wallet system shipped (Privy embedded, auto-create); needs a real-funds test launch before promoting to live.',
  },
  {
    id: 'openlaunch', label: 'Our launcher (openlaunch)', chains: ['base', 'robinhood'], status: 'builder-ready',
    monetization: 'Treasury bps in immutable recipients (e.g. 90/10). Automatic, no hook.',
    notes: 'Builder + Safe gate ready in lib/openlaunch. Needs: startTick sizing UX, Arweave metadata, Safe deployed. Ships on attention.',
  },
];
export function endpointFor(id: LaunchEndpointId): LaunchEndpoint {
  const found = LAUNCH_ENDPOINTS.find((e) => e.id === id);
  if (!found) throw new Error(`Unknown launch endpoint ${id}`);
  return found;
}
