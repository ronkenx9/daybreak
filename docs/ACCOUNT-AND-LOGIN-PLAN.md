# Daybreak account and login implementation plan

Status: implementation plan, not shipped. Updated 2026-09-06.

## 1. Outcome

One Daybreak account, accessible through Google, Apple, a passkey or a verified wallet login. The account owns the user's profile, private watchlists, discoveries and circle memberships across devices. A wallet is an optional linked identity and holdings source.

Anonymous visitors can discover companies and preview public circles. Ask for an account when they join a circle, publish, follow someone or synchronize saved content. Preserve the owner's current visual design.

## 2. Current state and scope

Current code uses wagmi with Coinbase Wallet and injected connectors in `lib/base/wagmi.ts`; `components/daybreak/ConnectButton.tsx` only establishes a wallet connection. Holdings use public address reads. `components/daybreak/DaybreakApp.tsx` stores profile, bookmarks and joined example circles in `daybreak_profile_v1` localStorage. There is no authenticated user database or server session.

This release delivers authentication, account linking, persistent personal data and the identity foundation for circles. It does not implement trading, automatic portfolio publication, a full social feed or real-time chat. Existing illustrated community examples must remain clearly labeled until replaced by real accounts.

## 3. Proposed architecture and decisions

| Layer | Proposed choice | Responsibility |
| --- | --- | --- |
| Authentication | Privy, subject to integration spike and provider setup | Social, passkey and wallet authentication; linked identities |
| Application API | Existing Next.js server routes | Verify access token, resolve internal user, authorize each operation |
| Persistence | Managed PostgreSQL; deployment vendor to be selected | Profiles, watchlists, discoveries, membership and visibility |
| Wallet data | Existing wagmi/Base reader | Read holdings separately from app authentication |
| Client data | React Query, keyed by internal user ID | Fetch account data and invalidate on changes/logout |

Use a stable application UUID and a unique provider subject. Do not key users by email or wallet address. Choose the provider's supported server token verification path during the spike; do not implement an independent second session system. If cookies are introduced, specify HttpOnly/Secure/SameSite and CSRF handling before release. Keep secrets server-only and out of logs.

No embedded wallet is necessary for this release. A social signup must not create the expectation that existing stocks will appear before an existing wallet is linked.

## 4. User flows and screen structure

### A. Anonymous discovery → account creation

1. User browses Discover or a public circle without signing in.
2. A join/save-to-account/publish action opens the existing-style branded sign-in sheet, retaining the intended destination and action.
3. Present Continue with Google, Continue with Apple, Continue with wallet, and passkey sign-in for returning users. Decide passkey-first registration only after the provider spike proves enrollment and recovery support.
4. Successful authentication creates or resolves one internal user idempotently.
5. First-time onboarding asks only for display name and avatar; unique handle is required before publishing or being publicly discoverable.
6. Offer import of this device's saved companies, followed by optional passkey enrollment. Both are skippable.
7. Return to the intended action. Confirm actions that publish content or reveal information; do not silently publish after login.

### B. Returning social/passkey login

Authenticate → server validates session → fetch existing profile → restore personal data → return to destination. Passkey login uses the platform's prompt. Cancellation leaves the user on a usable sheet with alternatives. Never show a successful login based solely on a client callback.

### C. Wallet login

Connect selected wallet → request an authentication challenge through the provider → verify ownership, including supported contract-wallet validation → establish Daybreak session. The challenge must be domain-bound, nonce-based and expiring. Signing in is not a token approval or trade. A rejected signature creates no session. Test Coinbase smart accounts as well as EOAs.

### D. Link another method

Account settings → Security and login → Add Google/Apple/passkey/wallet → fresh authentication → prove the new method → reconcile against server-verified provider identity → show linked method. Linking must not create a second profile. If the identity belongs to another account, show an explicit conflict and recovery route; never silently merge accounts using email text.

### E. Link wallet for holdings

Authenticated user → Wallets → Link existing wallet → prove ownership before storing it as an account association → fetch supported Base holdings. Merely inspecting a public address must never establish ownership. Label which wallet is being viewed; one account may have multiple linked wallets. Do not count the same address twice.

### F. Sign out, disconnect and recovery

- Disconnect wallet ends its active connector session; it is distinct from signing out of Daybreak or unlinking the identity.
- Sign out ends the authentication session, clears private client caches and private rendered data, and returns to anonymous exploration.
- Removing a login method requires recent authentication and must leave another usable login/recovery method.
- Offer recovery through another already-linked method or the provider-supported recovery flow. Do not promise recovery without a proven method.
- Show linked methods and session controls supported by the provider. Account deletion and associated data-retention behavior must be specified before enabling a deletion UI.

### Required UI states

Idle, provider redirect/prompt pending, verifying session, first-time onboarding, importing data, authenticated, expired session, cancelled prompt, unsupported passkey/browser, account conflict, network failure and retry. All dialogs support keyboard focus, Escape where safe and restoration. Avoid resetting input or intended destination after recoverable errors.

## 5. Data model

| Entity | Key fields / rules |
| --- | --- |
| users | id UUID; auth_subject UNIQUE; created_at; onboarding_completed_at; account status |
| profiles | user_id UNIQUE FK; handle UNIQUE normalized; display_name; avatar reference; bio; profile visibility |
| linked_identities | user_id; provider identity id/type; verified timestamps; unique provider identity. Provider remains source of authentication truth. |
| linked_wallets | user_id; normalized address; network namespace; verification timestamp; private visibility default. Unique ownership association per namespace/address. |
| watchlists | id; owner_user_id; title; private/public/circle visibility; optional circle_id |
| watchlist_items | watchlist_id; stable company/token id; added_at; unique list/item pair |
| saved_discoveries | id; user_id; source content id/type; saved_at; private by default |
| circles | id; slug; name; visibility; status; owner_user_id |
| circle_memberships | circle_id + user_id UNIQUE; role; joined_at; status |
| migration_imports | user_id; import fingerprint/version; completed_at; prevents duplicate imports |

Apply foreign keys, uniqueness and transactional writes. Keep issuer contract identity distinct from company identity: a company may have multiple instruments. The first account release may ship only profile and default watchlist tables, but do not store memberships permanently as numeric indexes into example UI arrays.

## 6. API and authorization contract

Proposed routes; adapt naming to the chosen SDK, not vice versa:

| Route | Behavior |
| --- | --- |
| GET /api/me | Verify token; resolve user; return permitted profile and onboarding state |
| PATCH /api/me | Validate editable fields; update only authenticated user's profile |
| GET/POST /api/watchlists | Read authorized lists / create own list |
| POST/DELETE /api/watchlists/:id/items | Authorize ownership, validate stable item ID, idempotent add/remove |
| POST /api/me/import-local | Explicit, schema-validated, idempotent local-profile import |
| POST /api/me/reconcile-identities | Fetch verified provider identities server-side; never trust a client-submitted ownership claim |
| POST/DELETE /api/circles/:id/membership | Enforce circle visibility, invitations and role rules when real circles ship |

Provider handles OAuth/passkey/wallet challenges through its supported APIs. Every private route derives acting user from the verified session, not request user_id. Return 401 for no/expired session and 403 for disallowed access. Validate lengths, URLs and enums; rate-limit mutations and auth-sensitive routes. Verify signatures on any provider webhooks, deduplicate events and reconcile safely after retries.

## 7. Privacy and the circle foundation

Confirmed product structure: circles organize broader interests, not individual tickers. Stocks, shared watchlists, discoveries, memes and people live inside each interest circle. Companies can belong to multiple circles; membership does not imply ownership of their stocks.

Personal watchlists, wallet links and holdings are private by default. A member explicitly shares a list or discovery with a circle; joining does not reveal their entire account. Public profile visibility is a separate choice from holdings visibility.

Allow a shared list to be followed or copied into a personal list. A copy is a snapshot; following reflects future shared updates. Never suggest that following another person's list copies their holdings or executes purchases. Preserve creator attribution on saved discoveries. Privacy changes must revoke future access to the source list, including cached/API views; an already-created independent copy needs a clearly described policy.

## 8. Local data migration

Read the existing local profile only to offer a preview: number of saved companies, nickname/avatar and example-circle selections. Explicit user action imports allowed fields into the signed-in account. Validate and deduplicate known company IDs; skip obsolete IDs with a clear result. Example circles do not become real memberships automatically. Record import completion per account/version and do not re-import on every login. Do not delete local data until the user has a clear, recoverable migration outcome.

## 9. Build phases and completion gates

| Phase | Work | Gate |
| --- | --- | --- |
| 0: integration spike | Verify current Privy SDK compatibility with React 19/wagmi 3, token verification, Google/Apple setup, passkey enrollment/domain/recovery, smart-wallet auth; choose DB host | Document tested APIs, setup prerequisites, domain and pricing decision; no fake production buttons |
| 1: server foundation | Schema/migrations, token verifier, user resolver, /api/me, authorization helpers | Invalid/expired tokens rejected; one identity resolves one user under concurrent requests |
| 2: sign-in UX | Branded sheet, social/wallet/passkey flows, onboarding and destination restoration | New and returning users work; cancellations and failures recover cleanly |
| 3: persistence | Profile/default watchlist endpoints, account-keyed queries, local import | Data survives device/session changes; imports idempotent; account A never appears under B |
| 4: linking/security | Linked methods, wallets, reauthentication, conflict handling, logout/cache clearing | Identity cannot be attached without proof; last usable method protected; smart-wallet case passes |
| 5: circle readiness | Real membership identifiers and explicit visibility controls | Private watchlists/holdings not exposed by joining a circle |
| 6: release verification | Accessibility, mobile, provider failure, authorization and recovery tests | All checks below pass on configured staging domain; document remaining limitations |

## 10. Required tests

- New social signup and returning login reach the same profile; retries do not duplicate users.
- Passkey enrollment, login, cancellation, unsupported environment and a second-device/recovery path on the chosen domain.
- Wallet signature rejection, wrong domain/expired or replayed challenge, EOA and supported smart-wallet authentication.
- Linking a second method reaches the same user; conflicting linked identity cannot take over another profile.
- Logout/account switch/expired session clears private UI and invalidates private writes; public discovery remains available.
- Direct unauthorized requests cannot read/write another user's profile, private list, membership management or linked wallets.
- Local import is explicit, validates malformed input and remains idempotent.
- A social account without wallets has a useful personal experience and a truthful holdings-empty state.
- Keyboard/mobile login sheet, pending states, focus restoration and redirect return paths work.
- Authentication outage never degrades into a successful or fabricated session.

## 11. Setup checklist and handoff

Implementation needs: provider project/app ID and server verification configuration; enabled Google/Apple methods and credentials where required; allowed localhost/staging/production origins and callback URLs; stable passkey domain strategy; database URL and migration credentials. Store secrets in server environment configuration. Do not publish secrets in this document.

Read `docs/audit/DAYBREAK-FIXES-2026-09-06.md` before editing wallet logic. Keep existing read-only valuation contracts and the user's design intact. No transactions, deployment or vendor billing changes are part of this plan.

## 12. Provider resources

- Authentication methods: https://docs.privy.io/authentication/user-authentication/privy-auth
- Identity linking: https://docs.privy.io/user-management/users/linking-accounts
- Login-method setup: https://docs.privy.io/basics/get-started/dashboard/configure-login-methods

These support the candidate architecture. Recheck implementation APIs and account configuration in phase 0 rather than assuming every method is enabled out of the box.
