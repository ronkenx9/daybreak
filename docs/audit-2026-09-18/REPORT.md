# Daybreak audit — 2026-09-18

Scope: local working tree based on main at 223c899; source review of onboarding, dialogs, instrument review, holdings briefing, Circle news, account authentication, and launch submission. Existing uncommitted Muse changes were not modified.

## Findings

### Resolved P2 — Holdings briefing assigned xStocks events to Coinbase-only holders

Locations: lib/db/repo.ts:79; app/api/me/briefing/route.ts:10; lib/briefing/service.ts:61–76.

Eligibility is reduced to a list of company tickers, dropping chain and token identity. Every public company then receives xStocks corporate actions, with copy saying the event may affect the instrument the user verified. A user verified only for Base Coinbase AAPLc can therefore receive a Backed AAPLx issuer event presented as relevant to that holding. Company news can be shared, but issuer events require exact instrument matching. Pass verified instrument identities through the briefing pipeline and filter issuer events accordingly.

Resolution: the repository now returns verified ticker, chain namespace, and token address tuples. Corporate actions require the canonical Backed mint on `solana:mainnet`; company news remains shared across verified instruments.

### Resolved P2 — Multi-company Circle feeds silently omitted failed companies

Location: app/api/circles/news/route.ts:62–65.

For a Circle with two companies, let one news provider reject and the other return a fresh feed. Rejected results are discarded, and stale is computed only from surviving lanes. The endpoint returns HTTP 200 with stale:false and no missing-company metadata, caching the incomplete feed for five minutes. Preserve failed lanes as coverage metadata and visibly label partial coverage.

Resolution: the endpoint returns company coverage with unavailable symbols, marks partial feeds stale, and the Circle UI labels the missing updates while preserving available stories.

### Resolved P2 — Daily launch allowance was only process-local

Locations: app/api/token-launches/route.ts:10,25; lib/server/requests.ts:createKeyedRateLimit.

The advertised one-launch-per-account-per-24-hours rule is held in a module-level Map. A cold start, redeploy, or another server instance starts an empty allowance. Distinct launch intents can pass the limit on separate instances; the database claim only protects the individual operation. Enforce the account-wide allowance transactionally in durable storage. This is a quota-enforcement issue; it does not establish unauthorized wallet signing.

Resolution: deployment claims now take a PostgreSQL transaction advisory lock keyed to the user, count durable launch states in the prior 24 hours, and transition the operation in that same transaction.

### Resolved P2 — Simultaneous dialogs competed for keyboard focus and Escape

Locations: components/daybreak/Dialog.tsx:5–7; components/daybreak/DaybreakApp.tsx:54,71,93,95.

A first-time visitor opening /app?stock=AAPL can mount both the stock dialog and the automatic walkthrough. Each installs its own document-level Tab/Escape handler and stores its own body overflow value. Escape invokes both close callbacks; Tab handlers can move focus into the covered dialog. Independent overflow restoration can also leave scrolling in the wrong state. Use a single active-modal policy or a modal stack where only the top dialog handles focus and dismissal, with reference-counted scroll locking.

Resolution: dialogs register in a shared stack. Only the top dialog handles Tab, Escape, and backdrop dismissal; body scroll is restored after the final dialog closes and focus returns to the next active dialog.

### Resolved P3 — Briefing illustration stretched stock marks into pills

Locations: app/daybreak.css:1400; components/daybreak/Identity.tsx:48.

The rule .db-guide-briefing>div>span{flex:1} applies to both the text wrapper and StockIcon, because StockIcon returns a span. The logo tile expands despite its specified 36px width. This is visibly present in guide screen 5 captured in the preceding conversation. Target the text wrapper separately and keep stock marks flex:none.

Resolution: the text wrapper has a dedicated class and stock icon tiles explicitly retain their fixed size.

## Verification

- `node scripts/verify-holdings-briefing.mjs`: passed exact-instrument and Base-only regression cases.
- `node scripts/verify-audit-fixes.mjs`: passed partial coverage, durable quota route, dialog stack, and walkthrough layout assertions.
- `npm test`: 39 acceptance groups passed.
- `npm run type-check`: passed.
- `npm run build`: production build compiled successfully.
- Local browser verification: walkthrough stock marks rendered at 36×36 with `flex: 0 0 auto`; two stacked dialogs became one after a single Escape, retained the Apple stock dialog and body scroll lock, then restored scrolling after the final Escape.

## Limitations

This is a focused source and regression audit, not a full penetration test. No authenticated multi-account browser session, real launch, or signed transaction was run. The durable quota is verified through transaction structure and route behavior without issuing a live deployment. Existing local Muse edits and untracked planning/export files were preserved.
