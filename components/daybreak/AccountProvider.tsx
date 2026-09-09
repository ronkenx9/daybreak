'use client';

import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { PRIVY_APP_ID, isAuthConfigured } from '@/lib/account/config';

export type LoginMethod = 'google' | 'apple' | 'passkey' | 'wallet';

export interface AccountUser {
  id: string;
  label: string;
  email: string | null;
  wallet: string | null;
  methods: string[]; // linked identity types, e.g. ['google','wallet']
}

export interface AccountState {
  configured: boolean; // a Privy app ID is present
  ready: boolean; // provider finished initialising
  authenticated: boolean;
  user: AccountUser | null;
  login: (method?: LoginMethod) => void;
  logout: () => void;
  linkWallet: () => void;
  payCreationTransfer: (transaction: {to:string;value:string;data:string}) => Promise<string>;
}

// Default = anonymous. This is what the app sees when auth isn't configured, so
// every consumer works without a Privy provider mounted above it.
const ANON: AccountState = {
  configured: false, ready: true, authenticated: false, user: null,
  login() {}, logout() {}, linkWallet() {}, payCreationTransfer: async () => { throw new Error("Sign in first"); },
};

const AccountContext = createContext<AccountState>(ANON);
export const useAccountState = () => useContext(AccountContext);

function AccountBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout, linkWallet } = usePrivy();
  const {wallets} = useWallets();
  const value = useMemo<AccountState>(() => {
    // Privy's User shape varies by linked method; read it defensively.
    const u = user as any;
    const linked: any[] = u?.linkedAccounts ?? [];
    const email: string | null =
      u?.email?.address ?? u?.google?.email ?? u?.apple?.email ??
      linked.find((a) => typeof a?.type === 'string' && a.type.includes('oauth'))?.email ?? null;
    const wallet: string | null =
      u?.wallet?.address ?? linked.find((a) => a?.type === 'wallet')?.address ?? null;
    const label = email ?? (wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Your account');
    return {
      configured: true, ready, authenticated,
      user: user ? { id: u.id, label, email, wallet, methods: linked.map((a) => a?.type).filter(Boolean) } : null,
      login: (method) => login(method ? ({ loginMethods: [method] } as never) : undefined),
      logout: () => logout(),
      linkWallet: () => linkWallet(),
      payCreationTransfer: async ({to,value,data}) => {
        const val=BigInt(value||'0');
        if (val>0n) {
          // Native ETH: only the request marker as data, and capped at 0.1 ETH so
          // a bug can never overspend on a fee that is only cents/dollars.
          if(!/^0x[a-f0-9]{40}$/i.test(to)||!/^0x[a-f0-9]{64}$/i.test(data)||val>10n**17n)throw new Error('Invalid creation payment');
        } else {
          if(!['0x833589fcd6edb6e08f4c7c32d4f71b54bda02913','0xfde4c96c8593536e31f229ea8f37b2ada2699bb2'].includes(to.toLowerCase())||!/^0xa9059cbb[0-9a-f]{192}$/i.test(data))throw new Error('Invalid creation payment');
        }
        const signer=wallets.find(w=>w.address.toLowerCase()===wallet?.toLowerCase());
        if(!signer)throw new Error('Your Daybreak wallet is still loading. Try again shortly.');
        await signer.switchChain(8453);
        const provider=await signer.getEthereumProvider();
        const hash=await provider.request({method:'eth_sendTransaction',params:[{from:signer.address,to,data,value:val>0n?`0x${val.toString(16)}`:'0x0',chainId:'0x2105'}]});
        if(typeof hash!=='string'||!/^0x[a-f0-9]{64}$/i.test(hash))throw new Error('Wallet did not return a payment transaction');
        return hash;
      },
    };
  }, [ready, authenticated, user, login, logout, linkWallet, wallets]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export default function AccountProvider({ children }: { children: ReactNode }) {
  if (!isAuthConfigured) return <>{children}</>;
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: { theme: 'light', accentColor: '#0210ef' },
        // Give each new account a self-custodial EVM (Base) wallet on login, but
        // only if they didn't bring their own — a wallet login keeps using theirs.
        // The wallet starts empty; login never moves funds or implies holdings.
        // Solana stays off (Daybreak is Base-only).
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
          solana: { createOnLogin: 'off' },
        },
        loginMethods: ['google', 'apple', 'passkey', 'wallet'],
      }}
    >
      <AccountBridge>{children}</AccountBridge>
    </PrivyProvider>
  );
}
