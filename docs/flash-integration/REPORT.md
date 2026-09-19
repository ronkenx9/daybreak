# Definitive Flash integration — 2026-09-19

Daybreak's live Conviction thesis detail now offers a separate **Buy the stock** action. It places a Solana USDC-to-canonical-xStock Flash limit order with a user-selected maximum pair price. The Meteora thesis-token market remains a separate action.

## Integration path

1. The authenticated quote route derives the target xStock mint from the public thesis and the signed-in user's Privy-linked Solana wallet. It fixes the spent mint to Solana USDC, requests a Flash `limit` quote with `forceMinimalAllowance: true`, and seals the quote, amount, price, wallet, thesis, nonce, and deadline in an HMAC review.
2. When Flash returns missing ATA or delegation instructions, Daybreak validates their programs/accounts/amounts, builds one narrowly scoped setup transaction, and asks the user's wallet to sign it. The setup route accepts only the reviewed transaction, broadcasts it, and waits for confirmation.
3. The wallet Ed25519-signs Flash's exact `svm.orderMessage`. The order route verifies the signature and account binding before submitting the matching `quoteId`, nonce, deadline, and terms to Flash.
4. Daybreak reads recent Flash orders for the same wallet and canonical stock pair, and offers a share action on the thesis after order submission.

## Evidence and limits

- A live read-only Flash quote returned HTTP 200 and a valid limit quote for canonical AAPLx `XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp` against Solana USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`. Its setup contained two ATA instructions and one scoped SPL delegation. Daybreak's unsigned setup builder decoded and assembled all three successfully. No wallet was signed, no setup was broadcast, and no order was submitted.
- Four integration gates passed twice: bounded review/signature tests, TypeScript, production build, and README integration references. The production build includes all four Flash API routes.
- The local Conviction feed currently reports **No public theses yet**, so the new panel cannot be clicked through without a published live thesis. Browser verification reached the optimized page and confirmed that state; the signed-in, funded-wallet execution path remains untested.
- Flash's shared key works for a read-only quote. Set `DEFINITIVE_FLASH_API_KEY` for Daybreak's own integrator attribution before a hackathon submission or production order flow.

Primary API references: [Solana overview](https://flash.definitive.fi/docs/solana-overview), [quote](https://flash.definitive.fi/docs/api-reference/flash/quote), [order](https://flash.definitive.fi/docs/api-reference/flash/order), [orders](https://flash.definitive.fi/docs/api-reference/flash/list-orders).
