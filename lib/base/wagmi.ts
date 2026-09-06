import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors/coinbaseWallet';
import { injected } from 'wagmi/connectors/injected';


// Base-native wallet stack. Coinbase/Base Account (smart wallet + EOA) plus a
// generic injected connector for MetaMask/Rabby. No WalletConnect projectId
// needed. Read-only for now; the same config powers the 0x swap later.
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({ appName: 'Daybreak', preference: { options: 'all' } }),
    injected({ shimDisconnect: true }),
  ],
  transports: { [base.id]: http('https://mainnet.base.org') },
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
