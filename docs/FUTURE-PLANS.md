# Daybreak future plans

Updated 2026-09-06. Planned work; none of the features below are represented as shipped.

## Accounts: social login, passkeys and wallet login

Owner direction: support social login, passkeys and wallet login through one Daybreak identity.

Current implementation only connects Coinbase/injected wallets for read-only holdings. It does not create an authenticated Daybreak account. Nickname, avatar, saved companies and circles currently live in browser localStorage.

Recommended first release:
- Allow anonymous discovery. Offer Continue with Google, Continue with Apple, Use a passkey and Continue with wallet in one branded sign-in sheet.
- Use one stable internal user ID across explicitly linked sign-in methods. Wallet login must prove ownership with a verified sign-in challenge; connecting a wallet alone is not authentication.
- After social signup, offer passkey enrollment for subsequent sign-ins. Provide enrollment and returning-user flows separately; do not force wallet creation or funding to use discovery.
- Keep app identity separate from holdings sources. A social user can link existing wallets later; discovering stocks must not imply those stocks were transferred into a newly created embedded wallet.
- Persist nickname, avatar, bookmarks and circle membership to a backend keyed by user ID. Offer explicit import of this browser's saved profile on first sign-in, with deduplication; do not silently import another user's local profile on a shared device.
- Verify sessions on the server and authorize every private read/write. Require fresh authentication before linking/unlinking login methods, enforce unique provider identities, and never merge accounts based only on matching email text. Handle an already-linked wallet as an explicit recovery/linking conflict.
- Keep at least one usable login/recovery method when unlinking. Distinguish disconnecting a holdings wallet from signing out of Daybreak. Clear account-specific client caches on logout/account change.

Provider recommendation: evaluate Privy for one supported social/passkey/wallet identity layer. Official documentation describes these methods and explicit account linking. Provider selection, current pricing and configuration remain implementation prerequisites; no vendor account or credentials have been created.

Implementation sequence: configure provider and OAuth callbacks/passkey domain → add server session verification and user database → build sign-in/linking UI → migrate local profile with consent → connect verified wallet identities to existing holdings reader → test signup, returning login, cancelled prompts, account conflicts, recovery, logout and access isolation. Retain the current design.

Resources:
- https://docs.privy.io/authentication/user-authentication/privy-auth
- https://docs.privy.io/user-management/users/linking-accounts
- https://docs.privy.io/basics/get-started/dashboard/configure-login-methods

## Circle-first discovery: stocks, people and memes

Owner correction, 2026-09-06: the circle is the starting point. People enter an interest or niche and discover its stocks, memes, members' shared watchlists and other discoveries together. This supersedes the earlier meme-first funnel.

Proposed loop: join a circle → explore what members are watching and sharing → save a discovery or follow/copy a shared watchlist → build a personal view across chosen circles → contribute something back.

Confirmed owner decision: circles center on broader interests such as AI, gaming or everyday brands. Individual stocks sit within those circles; stock-specific groups are not the primary structure. A company may appear in multiple relevant circles. Memes supply humor and cultural context inside that niche, alongside company discoveries, news and watchlists. They are one content type, not the organizing structure of the whole app.

Proposed circle structure: an overview/curated feed, stocks, shared watchlists, discoveries (including memes), and people. Test the smallest useful presentation before adding separate navigation for every content type. A personal feed combines chosen circles and followed people/lists.

Distinguish actions: Save adds a discovery to a private personal collection; Follow keeps a link to an evolving shared list; Copy creates an independent editable snapshot with attribution. None of these copies holdings or executes a trade.

Private by default: users choose which lists or discoveries to share. Circle membership must not expose private bookmarks, wallet addresses or portfolio balances. People can participate without owning a stock. Keep satire distinguishable from factual news and require credit/usage permission for meme media. Plan reporting, moderation and spam controls before opening submissions broadly.

Start with a few curated circles and enough useful shared lists/discoveries to make each worth revisiting. Evaluate saves, meaningful contributions and repeat visits; avoid rewarding trading volume, wealth or raw meme virality. Do not automatically label popularity as investment quality.

Detailed account foundation: [Account and login plan](ACCOUNT-AND-LOGIN-PLAN.md).
