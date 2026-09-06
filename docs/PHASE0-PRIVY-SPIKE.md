# Phase 0 — Privy integration spike (results)

Date: 2026-09-06. Gate from ACCOUNT-AND-LOGIN-PLAN.md §9. Outcome: **Privy is compatible** with this stack; foundation built and runs anonymously. Live auth needs an app ID; cross-device sync still needs a database (Phase 1/3).

## Compatibility findings (tested in-repo)
- Stack: Next 15.1, React 19, wagmi 3.7, viem 2.56. Privy `@privy-io/react-auth@3.40`.
- **Install requires `--legacy-peer-deps`**: Privy pulls `permissionless`→`ox@^0.8` which conflicts with viem 2.56's `ox`. Resolution works at runtime; typecheck + build pass.
- **Must also install `@stripe/stripe-js`**: Privy's fiat-onramp screen imports it; without it the webpack build fails `Module not found`. We don't use onramp, but the import is static.
- `@farcaster/mini-app-solana` is an unresolved optional import → **benign build warning** only, non-fatal.
- Privy v3 config nests embedded-wallet creation under `ethereum`/`solana` (`embeddedWallets.ethereum.createOnLogin`), not top-level.
- `loginMethods` union includes `google`, `apple`, `passkey`, `wallet` — all four requested methods are valid.
- **Bundle cost**: `/app` First Load JS ~117kB → ~873kB with Privy. Flag: lazy-load the provider / dynamic-import before release.

Install command used:
    npm install @privy-io/react-auth @stripe/stripe-js --legacy-peer-deps

## What was built (this session)
- `lib/account/config.ts` — reads `NEXT_PUBLIC_PRIVY_APP_ID`; `isAuthConfigured` gate.
- `components/daybreak/AccountProvider.tsx` — mounts `PrivyProvider` only when configured; otherwise renders children with an anonymous account context. Exposes `useAccountState()` ({configured, ready, authenticated, user, login, logout, linkWallet}). `createOnLogin: 'off'` — no embedded wallet, so a social login never implies a funded wallet.
- `components/daybreak/SignInSheet.tsx` — branded sheet (reuses `Dialog`). Shows the four login methods when configured; an honest "not switched on" note otherwise. No fake buttons.
- Wired in `app/layout.tsx` (AccountProvider wraps Web3Provider) and the Profile tab (a Daybreak-account row, separate from the Wallet row). Auth identity is kept separate from the holdings reader (wagmi), per plan §3.

## Verified
- tsc clean; production build passes (warnings only). App runs fully anonymous with no app ID: discovery, prices, read-only holdings all intact; Profile shows "Create account"; the sheet shows the not-configured state; no page errors.
- NOT verified (needs external setup): an actual Google/Apple/passkey/wallet login (needs a Privy app ID), and cross-device persistence (needs the DB).

## To switch it on (owner prerequisites)
1. Create a Privy app at the Privy dashboard → copy the App ID.
2. Add `NEXT_PUBLIC_PRIVY_APP_ID=<id>` to `.env.local` (and staging/prod env).
3. In the Privy dashboard: enable Google + Apple OAuth (credentials where required), configure the passkey domain, enable wallet login; add allowed origins (http://localhost:3011 + staging + prod) and callback URLs.
4. For synced bookmarks/profile/circles across devices (plan Phases 1 & 3): pick a managed Postgres host, add server session verification and `/api/me`, then migrate the local `daybreak_profile_v1` with consent. Until then, signing in establishes identity but saved companies remain on-device.

## Not done / next
Server sessions, user database, account linking/reconciliation, local-profile import, and circle membership persistence (plan Phases 1–5). Consider `next/dynamic` for the Privy provider to recover the bundle size.
