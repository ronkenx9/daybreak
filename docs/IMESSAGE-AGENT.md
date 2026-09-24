# Daybreak in iMessage

Daybreak's iMessage agent is a Spectrum Cloud worker. A person texts a company, ticker, or question; the worker translates that message into calls to Daybreak's existing structured public tools and replies with concise, linked results.

## What it can do

| Text | Result |
| --- | --- |
| `NVDA price` | Timestamped underlying NVIDIA share reference, source, freshness label, and Daybreak company link |
| `What's happening with Tesla?` | Up to three linked headlines, related public Circle count, and company link |
| `paper theses on Apple` | Public conviction-market cards with mode, author kind, activity, and direct links |
| `find stock tokens for Microsoft` | Canonical Base and Solana stock-token identities from Daybreak's catalog |
| `create a thesis on NVDA` | A prefiltered Daybreak paper-thesis creation handoff |
| `trade an NVDA thesis` | A prefiltered Daybreak conviction-market handoff |

Follow-ups reuse the last recognized company per conversation for six hours, so `NVDA price` followed by `any news?` stays on NVIDIA. The cache is bounded and held only in worker memory. It contains a ticker and timestamp, never message history, wallet data, or credentials.

The agent does not place trades, publish theses, connect a wallet, or move funds. These actions require an authenticated Daybreak screen where the person can see and confirm the exact action. Price responses say when a number is an underlying equity reference rather than an executable stock-token quote. Private-company pre-stock entries never receive invented public-equity prices.

## Architecture

```text
iMessage
   │
   ▼
Photon Spectrum Cloud (persistent gRPC stream)
   │
   ▼
Daybreak iMessage worker
   ├── intent routing + bounded per-chat ticker memory
   ├── burst debounce + per-chat ordered processing
   └── fixed HTTPS client
          │
          ▼
POST /api/okx/tools
   ├── discover_stock_tokens
   ├── get_stock_market_data
   ├── get_company_context
   └── find_theses
```

The worker uses the lean Spectrum 12.2.0 packages, `@spectrum-ts/core` and `@spectrum-ts/imessage`, with `imessage.config()`. It filters outbound echoes with Spectrum's universal `message.direction`, accepts text content, marks handled messages read where supported, and uses `space.responding()` while replying. A short debounce combines normal text bursts into one turn. A bounded 24-hour in-memory message-ID cache suppresses duplicate cloud deliveries while the worker is running and releases failed sends for retry. Daybreak tool names and the API path are fixed in code; message text cannot choose an endpoint or supply authorization headers.

## Configuration

Copy `services/daybreak-imessage/.env.example` to `.env.local` for local development. Required secrets:

- `SPECTRUM_PROJECT_ID`
- `SPECTRUM_PROJECT_SECRET`

Optional settings control Daybreak origins, debounce time, request timeout, reply length, and the health-check port. The worker never logs either Spectrum credential. `.env.local` is ignored by Git and excluded from the Docker build context, and the packaging check fails if a Spectrum credential assignment appears in a tracked file.

## Local verification

From `services/daybreak-imessage`:

```sh
npm install
npm test
npm run build
npm run smoke:spectrum
npm run smoke:daybreak
npm run dev
```

The smoke check authenticates to Spectrum Cloud and stops without contacting any recipient or sending a message. The behavioral suite uses an isolated fake Daybreak API and covers price labeling, news, public paper theses, token identity, conversation memory, review handoffs, private-company price handling, endpoint confinement, prompt-injection text, and burst batching.

## Photon line setup

Spectrum Cloud's Free and Pro plans use shared lines. Each recipient must be registered as a project user in the Photon dashboard before outbound outreach, and a recipient may see a different pool number. A dedicated Business line gives Daybreak a consistent number and enables group features. Photon documents default cloud quotas of 5,000 messages per server per day and 50 new conversations per line per day. Confirm the current plan and quota in Photon before launch.

The worker needs a persistent process because Spectrum receives iMessage traffic over a long-lived stream. A normal Vercel request function is the wrong runtime. Use the provided container on an always-on worker host. The repository-root `render.yaml` describes a Render background worker with the correct monorepo Docker paths; add both Spectrum values as secret environment variables in the host.

## Operations

- Liveness: `GET /healthz`
- Readiness: `GET /readyz`
- Graceful shutdown: `SIGINT` or `SIGTERM` drains queued replies, stops Spectrum, then closes the health server.
- Failures return a short public fallback. Internal errors and credentials are never sent to the chat.
- Rotate the Spectrum secret immediately if it is pasted into a chat, ticket, log, or other non-secret channel, then replace the worker environment value.

Official references: [Spectrum SDK](https://github.com/photon-hq/spectrum-ts), [iMessage provider](https://github.com/photon-hq/skills/blob/main/skills/spectrum/providers/imessage.md), and [production agent patterns](https://github.com/photon-hq/skills/blob/main/skills/spectrum/best-practices.md).
