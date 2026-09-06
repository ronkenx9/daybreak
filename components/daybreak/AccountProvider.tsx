'use client';

import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
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
}

// Default = anonymous. This is what the app sees when auth isn't configured, so
// every consumer works without a Privy provider mounted above it.
const ANON: AccountState = {
  configured: false, ready: true, authenticated: false, user: null,
  login() {}, logout() {}, linkWallet() {},
};

const AccountContext = createContext<AccountState>(ANON);
export const useAccountState = () => useContext(AccountContext);

function AccountBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout, linkWallet } = usePrivy();
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
    };
  }, [ready, authenticated, user, login, logout, linkWallet]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export default function AccountProvider({ children }: { children: ReactNode }) {
  if (!isAuthConfigured) return <>{children}</>;
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: { theme: 'light', accentColor: '#0210ef' },
        // Don't create an embedded wallet on login — a social account must not
        // imply a funded wallet or that stocks were moved into a new one.
        embeddedWallets: {
          ethereum: { createOnLogin: 'off' },
          solana: { createOnLogin: 'off' },
        },
        loginMethods: ['google', 'apple', 'passkey', 'wallet'],
      }}
    >
      <AccountBridge>{children}</AccountBridge>
    </PrivyProvider>
  );
}
