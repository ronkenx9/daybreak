# Daybreak x402 pairing-intelligence API

Daybreak sells a derived signal layer over its verified Base stock-token universe and observed direct stock/community-token pools. The free product remains free; the paid endpoint is designed for agents, dashboards, and researchers that need machine-readable ranking and coverage.

## Endpoint

`GET /api/v1/market/pairing-opportunities?window=24h&minLiquidity=5000&limit=10`

- Price: `0.005 USDC` per successful request.
- Settlement: x402 v2 with Circle Gateway on Base (`eip155:8453`).
- Configuration: set `DAYBREAK_X402_SELLER_ADDRESS` to the public EVM address that should receive Gateway USDC. No private key is used by the server.
- Unpaid requests return `402` with a base64-encoded `PAYMENT-REQUIRED` header.
- Paid requests return `200` only after the official Circle SDK verifies and settles the signed authorization. The response includes `PAYMENT-RESPONSE`.

## What buyers receive

- A bounded opportunity ranking calculated from liquidity, volume, transactions, turnover velocity, and absolute 24-hour movement.
- Pairing coverage per verified stock, including stocks with no qualifying community-token pair.
- Record-level pool and token identities, data freshness, methodology version, provenance, and caveats.

Scores describe observed activity. They do not predict returns and are not investment advice.

## Production checklist

1. Add `DAYBREAK_X402_SELLER_ADDRESS` in Vercel Production, Preview, and Development as appropriate.
2. Deposit buyer USDC into Circle Gateway before attempting a paid call.
3. Confirm an unpaid call returns `402` and inspect its decoded requirements before authorizing any payment.
4. Make one capped paid call and confirm a `200`, `PAYMENT-RESPONSE`, and the seller’s Gateway balance change.
