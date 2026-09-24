'use client';

import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets, useSignTransaction as useSignSolanaTx, useSignMessage as useSignSolanaMessage, useCreateWallet as useCreateSolWallet } from '@privy-io/react-auth/solana';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { PRIVY_APP_ID, isAuthConfigured } from '@/lib/account/config';
import { DAYBREAK_TOKEN, DAYC_TREASURY, isPinSinkConfigured } from '@/lib/base/daybreak-token';
import { base, xLayer } from 'viem/chains';
import { XLAYER_STOCKS } from '@/lib/xlayer/tokens';
import { XLAYER_VAULT_ADDRESS } from '@/lib/xlayer/vault';

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
  sendXLayerTransaction: (transaction: {to:string;data:string}) => Promise<string>; // vault calls, xStock approvals and xStock transfers on X Layer only
  signXLayerPermit: (permit: {token:string;name:string;amount:string;nonce:string;deadline:string}) => Promise<string>; // EIP-2612 permit for the vault, 0x signature
  payDaycPin: (amountRaw: string) => Promise<{ hash: string; from: string }>; // DAYC -> treasury, user signs
  payEconomyUsdc: (amountRaw: string) => Promise<{ hash: string; from: string }>;
  solanaWallet: string | null; // first linked Solana wallet (StonkFun launches)
  ensureSolanaWallet: () => Promise<string>; // address, creating embedded on first use
  signSolanaTransaction: (unsignedBase64: string) => Promise<string>; // returns signed tx base64
  signSolanaMessage: (message: string) => Promise<string>; // Ed25519 signature, base58
}

// Default = anonymous. This is what the app sees when auth isn't configured, so
// every consumer works without a Privy provider mounted above it.
const ANON: AccountState = {
  configured: false, ready: true, authenticated: false, user: null, solanaWallet: null,
  login() {}, logout() {}, linkWallet() {}, payCreationTransfer: async () => { throw new Error("Sign in first"); },
  sendXLayerTransaction: async () => { throw new Error("Sign in first"); },
  signXLayerPermit: async () => { throw new Error("Sign in first"); },
  payDaycPin: async () => { throw new Error("Sign in first"); },
  payEconomyUsdc: async () => { throw new Error("Sign in first"); },
  ensureSolanaWallet: async () => { throw new Error("Sign in first"); },
  signSolanaTransaction: async () => { throw new Error("Sign in first"); },
  signSolanaMessage: async () => { throw new Error("Sign in first"); },
};

const b64ToBytes = (b: string) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
const bytesToB64 = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); };

const AccountContext = createContext<AccountState>(ANON);
export const useAccountState = () => useContext(AccountContext);

function AccountBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout, linkWallet } = usePrivy();
  const {wallets} = useWallets();
  const {wallets: solWallets} = useSolanaWallets();
  const {signTransaction: privySignTx} = useSignSolanaTx();
  const {signMessage: privySignMessage} = useSignSolanaMessage();
  const {createWallet: createSolWallet} = useCreateSolWallet();
  const value = useMemo<AccountState>(() => {
    // Privy's User shape varies by linked method; read it defensively.
    const u = user as any;
    const linked: any[] = u?.linkedAccounts ?? [];
    const email: string | null =
      u?.email?.address ?? u?.google?.email ?? u?.apple?.email ??
      linked.find((a) => typeof a?.type === 'string' && a.type.includes('oauth'))?.email ?? null;
    // Privy tags BOTH embedded EVM and Solana wallets as type 'wallet', so never
    // trust the first 'wallet' match — require a real 0x EVM address. Prefer the
    // EVM wallets hook, then the primary wallet, then any linked EVM account.
    const isEvm = (a: unknown): a is string => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a);
    const wallet: string | null =
      wallets.map((w) => w.address).find(isEvm)
      ?? [u?.wallet?.address, ...linked.map((a) => a?.address)].find(isEvm)
      ?? null;
    const label = email ?? (wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Your account');
    const solanaWallet: string | null = solWallets[0]?.address ?? null;
    return {
      configured: true, ready, authenticated, solanaWallet,
      user: user ? { id: u.id, label, email, wallet, methods: linked.map((a) => a?.type).filter(Boolean) } : null,
      login: (method) => login(method ? ({ loginMethods: [method] } as never) : undefined),
      logout: () => logout(),
      linkWallet: () => linkWallet(),
      sendXLayerTransaction: async ({to,data}) => {
        // Only the Daybreak vault, approve(vault, amount) or transfer(to, amount) on a verified xStock. Never native value.
        const vault=XLAYER_VAULT_ADDRESS;
        const target=to.toLowerCase();
        const vaultCall=!!vault&&target===vault&&/^0x(ced2b692|a38a08b6|c5e38a7c|38d07436)[0-9a-f]*$/i.test(data);
        const approval=!!vault&&XLAYER_STOCKS.some(s=>s.token===target)&&new RegExp(`^0x095ea7b3000000000000000000000000${vault.slice(2)}[0-9a-f]{64}$`,'i').test(data);
        const transfer=XLAYER_STOCKS.some(s=>s.token===target)&&/^0xa9059cbb000000000000000000000000[0-9a-f]{40}[0-9a-f]{64}$/i.test(data);
        if(!vaultCall&&!approval&&!transfer)throw new Error('Invalid X Layer transaction');
        const signer=wallets.find(w=>w.address.toLowerCase()===wallet?.toLowerCase());
        if(!signer)throw new Error('Your Daybreak wallet is still loading. Try again shortly.');
        await signer.switchChain(xLayer.id);
        const provider=await signer.getEthereumProvider();
        const hash=await provider.request({method:'eth_sendTransaction',params:[{from:signer.address,to,data,value:'0x0',chainId:`0x${xLayer.id.toString(16)}`}]});
        if(typeof hash!=='string'||!/^0x[a-f0-9]{64}$/i.test(hash))throw new Error('Wallet did not return a transaction');
        return hash;
      },
      signXLayerPermit: async ({token,name,amount,nonce,deadline}) => {
        // Permits are only ever signed for the Daybreak vault as spender, on a verified xStock.
        const vault=XLAYER_VAULT_ADDRESS;
        if(!vault||!XLAYER_STOCKS.some(s=>s.token===token.toLowerCase())||![amount,nonce,deadline].every(v=>/^\d+$/.test(v)))throw new Error('Invalid permit');
        const signer=wallets.find(w=>w.address.toLowerCase()===wallet?.toLowerCase());
        if(!signer)throw new Error('Your Daybreak wallet is still loading. Try again shortly.');
        await signer.switchChain(xLayer.id);
        const provider=await signer.getEthereumProvider();
        const typed={domain:{name,version:'1',chainId:xLayer.id,verifyingContract:token},primaryType:'Permit',
          types:{EIP712Domain:[{name:'name',type:'string'},{name:'version',type:'string'},{name:'chainId',type:'uint256'},{name:'verifyingContract',type:'address'}],
            Permit:[{name:'owner',type:'address'},{name:'spender',type:'address'},{name:'value',type:'uint256'},{name:'nonce',type:'uint256'},{name:'deadline',type:'uint256'}]},
          message:{owner:signer.address,spender:vault,value:amount,nonce,deadline}};
        const signature=await provider.request({method:'eth_signTypedData_v4',params:[signer.address,JSON.stringify(typed)]});
        if(typeof signature!=='string'||!/^0x[a-f0-9]{130}$/i.test(signature))throw new Error('Wallet did not return a signature');
        return signature;
      },
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
      payDaycPin: async (amountRaw) => {
        // Pay DAYC to the treasury to pin a circle. Recipient is the fixed treasury
        // only; the user signs from their own embedded EVM wallet.
        if(!isPinSinkConfigured)throw new Error('Pinning is not available yet.');
        const amount=BigInt(amountRaw);
        if(amount<=0n||amount>10n**30n)throw new Error('Invalid pin amount');
        const signer=wallets.find(w=>w.address.toLowerCase()===wallet?.toLowerCase());
        if(!signer)throw new Error('Your Daybreak wallet is still loading. Try again shortly.');
        // ERC-20 transfer(treasury, amount) on the DAYC contract.
        const data=('0xa9059cbb'+DAYC_TREASURY.slice(2).toLowerCase().padStart(64,'0')+amount.toString(16).padStart(64,'0')) as `0x${string}`;
        await signer.switchChain(8453);
        const provider=await signer.getEthereumProvider();
        const hash=await provider.request({method:'eth_sendTransaction',params:[{from:signer.address,to:DAYBREAK_TOKEN.address,data,value:'0x0',chainId:'0x2105'}]});
        if(typeof hash!=='string'||!/^0x[a-f0-9]{64}$/i.test(hash))throw new Error('Wallet did not return a payment transaction');
        return { hash, from: signer.address };
      },
      payEconomyUsdc: async (amountRaw) => {
        if (!isPinSinkConfigured) throw new Error('Credit payments are unavailable.');
        const amount = BigInt(amountRaw);
        if (amount < 5_000_000n || amount > 25_000_000n || amount % 10_000n !== 0n) throw new Error('Invalid credit amount.');
        const signer = wallets.find(w => w.address.toLowerCase() === wallet?.toLowerCase());
        if (!signer) throw new Error('Your Base wallet is still loading.');
        const usdc = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
        const data = '0xa9059cbb' + DAYC_TREASURY.slice(2).toLowerCase().padStart(64,'0') + amount.toString(16).padStart(64,'0');
        await signer.switchChain(8453);
        const provider = await signer.getEthereumProvider();
        const hash = await provider.request({ method: 'eth_sendTransaction', params: [{ from: signer.address, to: usdc, data, value: '0x0', chainId: '0x2105' }] });
        if (typeof hash !== 'string' || !/^0x[a-f0-9]{64}$/i.test(hash)) throw new Error('Wallet did not return a payment transaction.');
        return { hash, from: signer.address };
      },
      ensureSolanaWallet: async () => {
        const existing = solWallets[0]?.address;
        if (existing) return existing;
        const created = await createSolWallet().catch(() => null);
        const address = (created?.wallet as { address?: unknown } | undefined)?.address;
        if (typeof address === 'string' && address) return address;
        throw new Error('Solana wallet created. Continue to sign.');
      },
      signSolanaTransaction: async (unsignedBase64) => {
        // Solana signing for StonkFun launches. Key never leaves the wallet.
        // Embedded wallets are created at login; this is the external-wallet
        // fallback: create one, then ask the user to sign again.
        const w = solWallets[0];
        if (!w) { await createSolWallet(); throw new Error('Solana wallet created. Sign again to continue.'); }
        // web3.js loads on demand so Solana signing never weighs down first paint.
        const { Transaction } = await import('@solana/web3.js');
        const tx = Transaction.from(b64ToBytes(unsignedBase64));
        const out = await privySignTx({ transaction: tx.serialize({ requireAllSignatures: false }), wallet: w });
        return bytesToB64(out.signedTransaction);
      },
      signSolanaMessage: async (message) => {
        const w = solWallets[0];
        if (!w) { await createSolWallet(); throw new Error('Solana wallet created. Sign again to continue.'); }
        const { signature } = await privySignMessage({ message: new TextEncoder().encode(message), wallet: w });
        const bs58 = (await import('bs58')).default;
        return bs58.encode(signature);
      },
    };
  }, [ready, authenticated, user, login, logout, linkWallet, wallets, solWallets, privySignTx, privySignMessage, createSolWallet]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export default function AccountProvider({ children }: { children: ReactNode }) {
  if (!isAuthConfigured) return <>{children}</>;
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: { theme: 'light', accentColor: '#0210ef' },
        // Give each new account self-custodial wallets on login, but
        // only if they didn't bring their own — a wallet login keeps using theirs.
        // Wallets start empty; login never moves funds or implies holdings.
        // Solana embedded wallets power StonkFun launches; EVM stays Base.
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
          solana: { createOnLogin: 'all-users' },
        },
        // External wallets link through the existing wallet login (EVM); Solana
        // coverage here is embedded wallets, which is all launches need.
        loginMethods: ['google', 'apple', 'passkey', 'wallet'],
        // Base stays the default; X Layer is added for the xStocks conviction vault.
        defaultChain: base,
        supportedChains: [base, xLayer],
      }}
    >
      <AccountBridge>{children}</AccountBridge>
    </PrivyProvider>
  );
}
