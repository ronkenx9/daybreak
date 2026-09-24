# Daybreak iMessage agent

An always-on Spectrum Cloud worker that lets people text Daybreak for stock-token discovery, timestamped equity reference prices, company news, public Circles, and conviction markets.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Add the Spectrum project ID and secret from the Photon dashboard.
3. Run `npm install`, then `npm run dev`.
4. Register the recipient as a project user in Photon when using a Free or Pro shared iMessage line.

The worker prints a readiness line after Spectrum authenticates. `GET /healthz` checks the process and `GET /readyz` checks whether the Spectrum stream is ready. The default port is `8787`.

## Try it

- `NVDA price`
- `What's happening with Tesla?`
- `paper theses on Apple`
- `find stock tokens for Microsoft`
- `create a thesis on NVDA`
- `trade an NVDA thesis`

The last two return a Daybreak handoff URL. The worker does not publish, place trades, connect wallets, or move funds through iMessage.

## Deploy

This is a persistent gRPC worker, so deploy it to an always-on worker/container host rather than a request-only serverless function. The service `Dockerfile` and repository-root `render.yaml` are ready for a Render background worker. Set `SPECTRUM_PROJECT_ID` and `SPECTRUM_PROJECT_SECRET` as secret environment variables in the host; never commit `.env.local`.

Spectrum Cloud shared lines route recipients through the shared pool and require Free/Pro recipients to be registered as project users before outreach. A dedicated Business line gives the project a consistent number and supports group features. See [Photon's iMessage provider guide](https://github.com/photon-hq/skills/blob/main/skills/spectrum/providers/imessage.md).

Full operating notes are in [the repository guide](../../docs/IMESSAGE-AGENT.md).
