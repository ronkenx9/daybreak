# Daybreak — App changes and Bankr implementation

> September 8, 2026. Concrete engineering companion to [Stocks-first UX](DAYBREAK-STOCKS-FIRST-UX-PLAN.md) and [Creator Markets](DAYBREAK-CREATOR-MARKETS-PLAN.md). Based on repository inspection this session. This document does not claim the integration is finished.

## Implementation status

The first working slice is present locally:

- `POST /api/trades/quote` validates an allowlisted Base stock and USDC amount, then returns a sanitized live Bankr quote.
- Stock detail embeds `TradeSheet` with amount entry, route review, minimum output, provider fee and estimated network cost.
- Execution stays disabled with an explicit wallet-authority message; the server key is not exposed or treated as a public signer.
- The landing page and Discover screen use the stocks-first hierarchy.
- `CommunitySpotlight` appears as a supporting section with transparent zero-state scoring and links into circles.
- Bankr capability reporting now distinguishes live quoting from transaction execution.

Verified locally with TypeScript, all 24 acceptance groups, the production build and a browser journey from AAPL detail to a resolved live quote. Muse generation, persisted Spotlight events, per-user Bankr execution, creator launch execution and LP signing remain subsequent slices.

## 1. Current reality, including the supplied key

`BANKR_API_KEY` is set in `.env.local`. The owner already supplied it; do not ask for it again or describe the integration as waiting for a key. Values must remain server-only and absent from reports.

A fresh read-only `GET https://api.bankr.bot/wallet/me` check returned HTTP 200 in this session. Authentication works. This proves neither public-user signing authority nor swap/launch permissions. No transaction was submitted.

The actual missing work is application wiring and verified wallet authority:

- `lib/bankr/config.ts` reads the user key and optional partner key.
- `lib/bankr/client.ts` defines quote, execution and launch wrappers. Their TypeScript shapes are not runtime response validation.
- `lib/bankr/capabilities.ts` now reports live quoting independently; trading and launches remain false until their end-to-end paths exist.
- `app/api/trades/quote/route.ts` now provides a bounded live quote path alongside the capability route. Execute and launch handlers do not exist yet.
- `StockDetails.tsx` now embeds an in-app Bankr quote review and keeps Uniswap as a clearly labeled fallback route.
- `StockLiquidity.tsx` has an in-app range/review builder, but signing remains disabled.
- `lib/db/schema.ts` already defines wallet connections, operations, trade quotes, community tokens, pools and launches. Verify applied migrations; schema definitions alone do not prove live persistence.
- The app already has account/auth modules and circle/discovery routes. Reuse them rather than planning authentication from scratch.
- The old capability matrix incorrectly says no credentials are configured. That statement is superseded.

The owner key may act on the owner's Bankr wallet. That does not automatically authorize trades from every visitor's connected wallet. Finish authenticated read-only qualification immediately, then choose the documented per-user execution mode. A missing partner capability is a specific integration issue, not a reason to leave the rest of the app unwired.

## 2. Exact screen changes

| Existing file/surface | Current behavior | Required app change |
| --- | --- | --- |
| `app/page.tsx` | Stock-led landing with existing hero and character crew | Apply latest stocks-first copy/hierarchy; link primary CTA to `/app`, secondary to circles; add bounded creation/Spotlight section below stock value proposition |
| `components/daybreak/DaybreakApp.tsx` | Discover, circles, holdings and profile orchestration; stock detail dialog | Preserve navigation; connect contextual trade and create sheets; extract new features into components instead of enlarging the monolith |
| `StockDetails.tsx` | Reference price, live Bankr quote review and labeled Uniswap fallback | Add authenticated execution wallet, quote expiry and Buy/Sell execution states |
| `MemestockDetail.tsx` | Community market detail | Add in-app Buy/Sell using same trade controller; display verified stock pairing; add community creation CTA and Capsule association |
| `TrendingMemestocks.tsx` / `MemestockTable.tsx` | Market-driven discovery | Preserve liquidity/volume sorting; add a distinct Spotlight section rather than substituting paid creative scores for market rankings |
| `CircleDiscoveries.tsx` and `/app/groups` | Membership and shared discoveries; sample holder section in app shell | Add community art gallery and Create action; replace sample holder feature with real contributions when available; keep a useful empty state |
| `StockLiquidity.tsx` / `EarnFeed.tsx` | Real pool discovery plus disabled signing | Connect a separate LP execution controller after swaps; show actual operation progress and resulting position. Never reuse swap success as LP success |
| `AccountProvider.tsx`, `ConnectButton.tsx`, `SignInSheet.tsx` | Existing identity and wallet surfaces | Show connected holdings wallet versus verified execution wallet where different; link execution mode to authenticated user |
| `Portfolio.tsx` and holdings route | Existing holdings view | Refresh balances after reconciled trade and show pending operation separately; do not optimistically mint holdings |
| `ShareRedirect.tsx` | Existing shared-link handling | Extend for community and creation links with source attribution; preserve old links |
| `app/daybreak.css` | Established brand and layout | Add trade/create/reveal/Spotlight states in existing design system; support reduced motion and mobile sheets |

All paths in the table are relative to repository root; component filenames without a prefix are under `components/daybreak/`.

## 3. Bankr execution architecture

`Authenticated Daybreak user → application route → validated intent + owned wallet binding → Bankr adapter → durable operation → onchain reconciliation → UI update`

Use `lib/account/auth-server.ts` and its existing authenticated-user guard. Never accept a client-supplied user ID or wallet reference as proof of authority.

### Credential and wallet decision

1. Use the existing key for documented read-only wallet/capability and stock-quote checks. Store sanitized evidence, never secrets or complete sensitive payloads.
2. Confirm which wallet the key controls and whether write permissions, location checks and deployment egress settings are satisfied. Quote success does not prove execution clearance.
3. For an owner-only signed-in integration, bind the credential's wallet to that verified owner explicitly. A public visitor cannot use it.
4. For public users, use Bankr's documented per-user linking/provisioning path with any required partner configuration. Do not assume Daybreak Privy JWTs are accepted by Bankr.
5. If Bankr documents an unsigned build route for the existing connected wallet, validate it and let that wallet sign. Do not invent this route or treat the server-signed `/wallet/swap` as unsigned calldata.
6. Expose contextual capabilities by authenticated user, instrument and operation, rather than flipping a global boolean because a key exists.

The default public experience remains inside Daybreak. Provider setup, signature and eligibility steps must clearly explain the actual wallet involved. If an external step is unavoidable, label it and preserve a return path.

### Server work

Extend existing modules rather than creating another client:

- `lib/bankr/client.ts`: endpoint-specific auth, bounded requests, runtime schema checks, sanitized provider errors. Global user/partner header selection must be checked against each endpoint's actual contract.
- `lib/bankr/capabilities.ts`: evidence-backed server capability checks; public flags must not expose secrets or wallet-sensitive configuration.
- Proposed `lib/bankr/wallets.ts`: resolve authenticated user to verified provider wallet binding.
- Proposed `lib/bankr/operations.ts`: durable intent, idempotency, ownership and state transitions.
- Proposed `lib/bankr/reconcile.ts`: verify chain, transaction result, recipient and actual quantities; recover unknown submissions.
- Proposed `lib/bankr/validation.ts`: request/response schemas, allowlisted assets, amount normalization and quote limits.

### Application routes to implement

These are Daybreak routes, not claims about Bankr endpoint names:

| Route | Responsibility |
| --- | --- |
| `GET /api/bankr/connection` | Authenticated execution-wallet status and actionable setup requirements |
| `POST /api/trades/quote` | Validate user/wallet/assets/amount; fetch and persist quote with expiry |
| `POST /api/trades/execute` | Confirm owned quote and unchanged intent, claim idempotency record, execute through verified signer mode |
| `GET /api/operations/[id]` | Return owned operation status and reconciled result |
| `POST /api/launches/preview` | Validate Base stock pairing, creator settings and actual simulation support |
| `POST /api/launches` | Submit an explicitly confirmed owned launch draft and persist operation |
| `GET /api/creator/earnings` | Verified accrued/claimed earnings for authenticated creator |

Never submit execution from an agent's unstructured conversational response. Bind exact token addresses, amount, fee recipient and chain to the user's reviewed intent.

## 4. Trade UX state machine

`enter amount → loading quote → review → confirmation/signature → submitted → confirmed / failed / unknown`

Review shows sell/buy assets, execution wallet, total charges, minimum received and quote expiry. Changing amount, wallet, chain or token invalidates the quote. Explicitly force Base; provider defaults must never choose another chain.

Unknown is a recoverable pending state. Poll/reconcile using the stored provider or transaction reference. Do not retry a potentially submitted trade as a new operation. HTTP 200 with `success:false` is a failure, not confirmation.

After confirmation: refresh the correct wallet's holdings, retain the circle/stock origin, and offer a separate optional share action. Refreshing the page restores pending operations.

## 5. Launch flow in the actual app

Add a secondary **Bring your community** creator entry in profile/circles. Existing-token connection comes first; an additional **Launch a coin** action uses qualified Bankr launch support.

`Circle → new/existing token → selected stock pairing → Muse visual identity → allocation/fee review → simulation → confirmation → pending → live community page`

Reuse `tokenLaunches`, `communityTokens`, `tokenPools` and `operations`. Extend with immutable reviewed intent, actual launch receipt and verified creator ownership where missing. Creator metadata and fee recipient are server-validated. Save drafts before invoking a provider.

Connect the launched market to its circle only after verifying token and pool identities. Do not create duplicate tokens when an uncertain launch response might already have deployed one. Keep stock purchase and community-coin purchase distinctly labeled.

## 6. Muse, sponsored generation and Spotlight wiring

New proposed components: `CommunityCreateSheet`, `CreationReveal`, `CommunitySpotlight`, `SponsorAllowanceSheet`, `CreatorCommunitySetup` and shared `TradeSheet`/`OperationStatus`.

New proposed server modules under `lib/muse/` connect Daybreak's authenticated user and community to Muse jobs. Choose the actual supported Muse API after inspecting its current deployment; no public URL or response schema is assumed here.

Add migrations for:

- `community_capsules`: circle/token identity, provider Capsule reference, version and verified controller.
- `generation_jobs`: user, Capsule version, request hash, provider reference, payment/allowance reference, state and output.
- `generation_allowances` plus immutable ledger entries: purchased budget, reservations, settlement and refund.
- `spotlight_events`: unique generation ID, community ID, earned/expires timestamps and reversal status.
- `creation_shares`: public creation reference and attribution; no private prompts/references or holdings.

Proposed Daybreak routes: `POST /api/communities/[id]/generations`, `GET /api/generations/[id]`, `POST /api/communities/[id]/sponsorships`, `GET /api/spotlight`, and public creation permalink `/creations/[id]`.

One eligible delivered and settled job earns one point for 24 hours. Record settlement and the unique scoring event consistently; retries must not add points. Refunds reverse points. Use a query over active events initially instead of requiring a new real-time infrastructure service; refresh visible rankings with modest polling. Animate real changes only.

The member flow is scene/idea → visible price or sponsorship → generate → delivered image → +1 point → optional share. Do not require a token purchase. Sponsorship purchase itself earns no score.

## 7. LP execution is a separate implementation slice

Preserve the ten verified stock/USDC pool discoveries. Complete swap wiring first. Then extend the current range review to a verified LP plan: funding assets → required swaps → approvals → mint → optional stake → receipt/token ID reconciliation.

Persist each step and actual balance changes. A swap API does not establish that Bankr provides a complete LP endpoint; qualify its documented skill/execution route or build wallet-signed Aerodrome calls using the existing signer. Do not expose an owner key to supply every visitor's position.

Until connected, keep the disabled state honest. Remove it only when the button invokes an actual supported operation controller.

## 8. Build order and concrete completion

1. **Correct configuration evidence:** acknowledge existing key; fresh authenticated read, sanitized quote and exact wallet-mode result; correct stale capability docs.
2. **Wire one real in-app stock trade:** server handlers, owned quote/operation persistence, `TradeSheet`, recovery and holdings refresh. This is the first implementation priority, ahead of more hero work.
3. **Apply the stocks-first screen hierarchy:** homepage, discovery and circles retain established branding and gain coherent contextual actions.
4. **Deliver one Muse creation end to end:** actual payment/sponsored allowance, durable job, output, single point and share link.
5. **Display the bounded Spotlight:** clear paid/sponsored rules and linked stock-paired community art.
6. **Wire creator launches and earnings:** documented per-user Bankr authority, simulation, confirmation, receipt and Capsule/circle association.
7. **Complete LP signing:** separate multi-step operation controller, reusing existing pool registry and UI.

Work can proceed on unaffected components while a provider requirement is resolved. Report an exact missing permission or endpoint with evidence; do not repeatedly list “Bankr qualification” as an indefinite blocker.

## 9. Validation and deployment

Use existing `npm test`, `npm run type-check`, `npm run build` and database preflight/verify scripts as appropriate. Add focused checks for cross-user quote access, double submission, expired quote, provider `success:false`, unknown-response recovery, scoring retries and refund reversal.

Inspect the stock → trade → result and community → create → score journeys at desktop and 390px. Test account switching and private data isolation. A deployment must include server environment configuration and applied migrations; local key presence alone does not prove production configuration.

Actual financial proof uses the owner's authorized signer, assets and amount. Never invent spending authority from this planning document. Do not claim public trading works because an owner-only request succeeded.

## 10. Definition of done

The plan is implemented when a permitted user can buy a supported Base stock inside Daybreak, return to a useful circle, create through Muse, see one correct Spotlight contribution, and share a working link. Creator launches and LP each have their own explicit working/incomplete status. Source code, endpoint presence and configured credentials are not substitutes for those user outcomes.
