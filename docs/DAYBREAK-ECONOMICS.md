# Daybreak economics: useful participation, paid services and DAYC

Date: 2026-09-20

Status: Stage 1 app implementation. The broader DAYC lock, revenue allocation and treasury policies below remain proposals, not announced token commitments.

Scope: DAYC utility, service credits, creator economics, community funding and treasury policy.

## 1. Purpose

Daybreak connects stock discovery, Circles, Conviction Markets and agents. Its economy should make useful participation easier and pay for the services that keep it useful.

The proposed loop is:

**Useful research and agents → better discovery and Circles → thesis participation and paid services → collected revenue → better tools, funded contributors and a measured DAYC allocation.**

The product must remain useful when DAYC's price is flat and promotional rewards are absent. Token purchases and incentives support a functioning product; they do not substitute for one.

## 2. Four distinct roles

| Asset or balance | Role | Boundary |
| --- | --- | --- |
| Stock token | The company-related asset a user chooses | Eligibility and issuer terms remain asset-specific |
| Thesis token | Participation in a particular investment idea | Not company equity, a guarantee of correctness or a promised payout |
| DAYC | Membership benefits, service payment and eventually community allocation rights | Not mandatory collateral or the required quote token for every thesis |
| Daybreak Credits | Dollar-denominated, non-transferable service balance | Not a second tradable token, investment or cash-yield account |

Live thesis creators continue choosing from eligible stock quote tokens. General permission to choose a stock does not bypass the supported-mint registry or pool validation.

Paper balances remain simulated. Public paper positions, trades and P/L do not become redeemable assets. Paper performance can contribute to a clearly labelled track record, but never automatically mints DAYC rewards.

## 3. Current foundation versus proposed work

The repository already includes DAYC membership checks and a DAYC Circle-pin payment path on Base. Conviction includes public paper participation and separate Solana live-market functionality. Flash stock orders are distinct from Meteora thesis-token trades.

The app includes a Credits ledger, Base USDC credit packs, a credit-funded Circle pin, and funded Circle research challenges. Each challenge reserves purchased credits, accepts one submission per account, and lets the sponsor award one contributor. Sponsors can cancel and recover a challenge only before any submission. A sponsor or contributor can open a dispute while a challenge remains open; this freezes the award and budget until an independent operator awards a submitted contribution or returns the budget to the sponsor.

The next paid-utility slice adds the on-demand Research Desk in You. A signed-in user selects a supported public company and gets a short AI snapshot with cited recent headlines, a case for, a case against, and points to watch. It is explicitly a headline-based snapshot, not full-article analysis, a personal recommendation, or a substitute for opening the sources. The first brief per account per UTC day is free. Further briefs cost $0.25 in Credits, or $0.20 while the existing verified DAYC holder benefit is available. The holder discount is limited to 500 paid briefs across the product per UTC month, a maximum $25 reduction in collected credits. The user's adjustable daily *paid* cap defaults to $1 and can be $0–$10. No recurring charge is configured. The server reserves the exact price before generation, validates the citations and shape of the response, and returns reserved credits if delivery fails. A two-minute stale reservation is recovered and returned on the next request. The gateway key and model are checked before any credit reservation.

Unused purchased Credits can be requested for a Base USDC refund to the original purchase wallet. The ledger conservatively consumes purchased Credits before earned challenge-award Credits for spending; earned awards never raise the refundable purchased balance. A request sets aside the requested credits and enters operator review; it is not an automatic onchain payment. Users may cancel before an operator claims it. The operator claims it before sending USDC, then records an exact, two-confirmation treasury-to-original-wallet transfer. A denied request releases the reserved credits. One purchase cannot have two simultaneous open refund requests, and cumulative fulfilled or open requests cannot exceed that purchase or the account's available purchased credits. This is a manual process; no SLA or automated cash-out is promised.

The Stats tab separates verified gross purchases, confirmed USDC refunds, available balances, challenge budgets, research and refund reservations, delivered pin/research services, and awarded Credits. The ledger verifier reconciles `purchased − confirmed refunds = available + delivered + all reserved obligations`. Credit purchases are not shown as earned revenue.

The present $DAYC membership badge and Research Desk price benefit check the linked wallet's balance. This is **not** a timed lock; a 30-day lock, member allowance, higher agent tiers, surplus allocation and treasury purchase mechanism are **not active**. They require the independent pricing, custody, reserve, accounting and control work described below. This release does not change Meteora's creator fee recipient or represent uncollected fees as Daybreak revenue.

### Operator runbook for the paid-utility slice

1. Apply migration `0025_economy_services.sql`, set a Bankr key with LLM Gateway access (`BANKR_LLM_KEY`, or the existing `BANKR_API_KEY` if enabled), and use a listed model (`BANKR_RESEARCH_MODEL`, default `gemini-3-flash`). The Research Desk checks the authenticated model list and disables paid requests when the key or model is unavailable. Verify source freshness and output quality on a signed-in account before inviting payments.
2. Set `DAYBREAK_ECONOMY_ADMIN_DIDS` to one or more trusted, comma-separated Privy DIDs. Without it, new refund requests and dispute filings remain paused, and the operator queue and decision routes fail closed; existing credits and challenges remain usable. An allowlisted operator sees a restricted review panel in You; the authenticated queue is also available at `GET /api/economy/admin/queue`. This grants review rights, **not** treasury signing rights.
3. For a refund, review its original payment, request, account history and destination wallet. Record a note and click **Claim before transfer**. Send the exact USDC amount on Base *from the published treasury* to the original wallet using a separately controlled wallet. Paste the confirmed transfer hash and click **Verify transfer & fulfill**. The server checks the exact USDC Transfer, origin, destination, amount, request time and two confirmations. If refusing a request, record a reason and use **Deny & release credits** only if no treasury transfer was sent. An operator cannot resolve their own request.
4. For a challenge dispute, inspect the published criteria, submissions and work URLs. Select an existing submission to award, or return the full reserved budget to the sponsor. Record a resolution note. The database moves the escrow exactly once; the sponsor and contributors cannot act as their own reviewer. If a reviewer needs more evidence, leave the dispute open rather than inventing an interim payout.
5. Run `npm run db:verify-economy` after migration and after any manual resolution. Match each fulfilled refund to its Base transaction. The operator panel does not execute transfers, and the resolution endpoints cannot sign with treasury funds.

Current DBC launch code sets `feeClaimer` to the creator. Do not assume Daybreak already receives a platform fee stream. Before recognising trading revenue, implement and verify the intended recipient configuration and reconcile actual receipts. Relevant code: [DAYC settings](../lib/base/daybreak-token.ts), [membership gate](../lib/base/dayc-gate.ts), [pin verification](../lib/base/dayc-pin.ts), [DBC launch](../lib/solana/dbc/launch.ts), [DBC configuration](../lib/solana/dbc/config.ts).

## 4. Free participation and paid utility

Keep discovery, reading Circles, publishing a basic thesis and basic public paper participation accessible without purchasing DAYC. Apply normal anti-abuse and usage limits rather than a universal token gate.

Charge for services that have recurring value and measurable delivery costs:

- Hosted agents, scheduled research and monitoring.
- Premium alerts, data and portfolio analytics.
- Advanced Circle management and reporting.
- Clearly labelled sponsored discovery placements.

External agents retain a useful free API allowance. Higher API limits and hosted services can be paid. Membership does not bypass wallet signing, agent permissions, spending limits or market eligibility checks.

### Daybreak Credits

Use an account ledger denominated in dollar value. Accept USDC or an equivalent DAYC amount quoted for a limited period. The same service has a predictable dollar price whichever payment asset is used.

Purchased credits, promotional credits and membership allowances must have separate ledger origins. Define consumption order, expiry, cancellation and refund terms before sale. No automatic renewal or recurring debit without explicit user authorisation.

Receiving prepayment is not the same as earning distributable revenue. Keep enough resources to deliver unused purchased credits and handle refunds. Recognise service revenue as obligations are fulfilled under the adopted accounting policy; exclude promotional credits from cash receipts.

DAYC accepted for services may need conversion to USDC to pay costs. Payment acceptance alone does not imply a burn or lasting token demand. Do not count the same receipt once as service income and again as token-purchase funding.

## 5. DAYC membership

Start with one proposed membership tier and a 30-day lock period. Benefits:

- A capped service-credit allowance.
- Discounts on Daybreak-owned fees and services.
- Advanced Circle and agent tools.
- Later, eligibility to participate in community budget allocation.

Set a published dollar reference for the required DAYC amount at activation. Use a manipulation-resistant pricing method; fail closed on stale pricing or insufficient liquidity. The amount and benefits are fixed for the active period, with no margin calls if DAYC falls.

At expiry, users can withdraw their locked DAYC or explicitly renew under the next period's disclosed terms. Locking does not transfer ownership to the operating treasury. It is not slashing collateral, a revenue receipt or a promise that its dollar value will be preserved.

The initial implementation needs a reviewed locking contract or equivalent verifiable mechanism. Existing balance-based membership checks alone do not enforce a term lock.

Budget the actual delivery cost of allowances and discounts. A lock supplies no cash for servers. Set limits from a funded programme budget and measured service costs; never offer unlimited compute or perpetual yield. Publish how existing membership benefits transition before introducing new terms.

## 6. Creator economics and organic distribution

Show the exact creator/platform fee arrangement before a live thesis launches, including bonding-curve fees, post-graduation arrangements and who may change parameters. Fee configuration for existing pools must not be silently represented as changed by a new product policy.

Creator earnings come from configured, realised market fees. Do not issue DAYC merely for creating a thesis or attracting raw trading volume.

A useful creator loop is: publish a clear thesis, maintain its evidence, discuss it in a Circle and share its public market page. The creator has a market and a track record worth distributing without referral-code rewards.

Display creator fee income separately from the creator's trading P/L and backers' outcomes. Fees can accrue even when participants lose money. Market demand does not establish whether an argument is true.

## 7. Circle research budgets

Allow sponsors, members and approved Daybreak grants to fund a Circle research budget. Start with fixed-budget challenges such as: “Compare Nvidia's revenue outlook, list the evidence and state what would invalidate the thesis.”

Each challenge records:

1. The funded amount, asset and funding source.
2. A specific deliverable, eligibility rules and deadline.
3. Published judging criteria and identified reviewers.
4. Conflict-of-interest disclosure, dispute handling and cancellation/refund rules.
5. Approved payouts and a public completion record.

Commit funds before accepting entries. Use a reviewed payment or escrow process; allocations without funds are not bounties. Sponsor-earmarked money remains restricted and is not general operating revenue.

Pay most bounties in USDC or useful service credits. A contributor may opt into DAYC at a disclosed current quote. Sponsored placements remain labelled and separate from organic ranking.

Do not pay for invitation counts, likes, wallet counts, wash volume or short-term paper P/L. Use fixed campaign ceilings and review related-party submissions. Never slash a participant merely because a sincere investment thesis was wrong.

## 8. Treasury accounting and surplus allocation

Eligible income comprises earned service revenue, earned sponsored-placement revenue and platform trading fees actually received. Exclude user deposits, locked DAYC, market reserves, LP capital, unused prepaid service obligations, sponsor-earmarked funds and unrealised token gains.

For a closed accounting period:

`Distributable surplus = max(0, eligible earned revenue − refunds and adjustments − provider costs − operating costs − required reserve funding)`

Use collected, reconciled cash to fund distributions. Account for prior deficits, unsettled liabilities and obligations before declaring surplus. Adopt a reserve target and valuation policy before activating this mechanism.

### Proposed pilot allocation

| Destination | Share of distributable surplus | Purpose |
| --- | ---: | --- |
| Product and treasury | 50% | Product investment and additional resilience |
| Contributor fund | 25% | Research, agent development and community programmes |
| DAYC purchase budget | 25% | Transparent token purchases tied to paid product use |

These percentages are a pilot proposal, not contractual rights or promised returns. Review quarterly, disclose changes prospectively and preserve existing funded obligations.

Example: a month with $10,000 in collected and earned revenue, $6,000 in costs and $2,000 required reserve funding leaves $2,000. Allocate $1,000 to product/treasury, $500 to contributors and $500 to the DAYC purchase budget. This assumes no additional refunds or liabilities.

If surplus is zero, revenue-funded allocations are zero. Separately budgeted launch subsidies may run, but must be reported as subsidies rather than recurring product economics.

## 9. DAYC purchase policy

Execute purchases periodically from the approved budget, with explicit limits for order size, slippage, available liquidity and price-source freshness. Defer spending when conditions are unsafe; budget availability does not require immediate execution.

Record source period, USDC spent, tokens acquired, execution costs, transactions and destination. Require reviewed treasury controls and separate permissions for approval and execution where practical. This design is not authorisation to make any purchases.

Initially retain purchased DAYC in a publicly identified treasury account under a published lock and release policy. Treasury-held tokens are not burned tokens, and future release can affect circulating supply. Specify the custody mechanism, lock duration, signers, permissible releases and reporting before activation.

Do not promise a token-price floor, fixed monthly purchases or automatic yield. Decide on permanent burns only after comparing them with future contributor needs and operating resilience.

## 10. Reputation and community allocation

Keep earned reputation independent from DAYC wealth. Track research updates, outcomes against stated criteria, completed funded work and agent reliability. Label paper versus live activity and disclose sample size and history; a lucky trade is not a verified research record.

DAYC does not buy an organic ranking boost, correctness badge or higher reputation.

Later, members may help allocate a bounded, already-funded community budget among vetted proposals. Define conflicts, concentration limits, quorum, review and dispute rules before opening voting. Voters do not control user funds, market outcomes or authenticity of evidence. Avoid an emissions competition before there is a useful budget to allocate.

## 11. Product and cross-chain UX

- **You:** membership term, locked DAYC, withdrawal date, benefits and credit balance.
- **Agents:** free allowance, per-job estimate, spend cap, usage history and explicit renewal settings.
- **Circles:** funded challenges, sponsor labels, deliverables and completed payouts.
- **Conviction:** chosen stock pair, market mode, actual fee terms and separate creator earnings.
- **Stats:** earned revenue, costs, reserves, programme spending, purchase records and outstanding obligations with definitions.

DAYC remains on Base while thesis markets run on Solana. Bind verified wallets to the same account and recognise benefits across the app. Users should not have to bridge simply to access membership benefits. Authorisation and settlement remain chain-specific; balances on one chain are not silently available on another.

Migration of existing paid pins must honour purchased periods. Existing member terms need an explicit transition policy. No second token, mandatory DAYC thesis pairing or automatic purchase programme is introduced by this document.

## 12. Rollout and acceptance criteria

| Stage | Deliverables | Exit criteria |
| --- | --- | --- |
| 0: baseline | Supply/treasury audit, cost model, fee-recipient audit and reserve policy | Quantities and obligations reconciled; proposed terms reviewed |
| 1: paid utility | Credits, one membership tier, metered agent services and sponsor-funded challenges | Correct billing/refunds; bounded allowances; paid retention and positive service contribution margin measured |
| 2: revenue linkage | Monthly accounting, treasury reporting and bounded DAYC purchase tooling | Earned receipts, obligations and reserves reconcile; custody and execution controls verified |
| 3: community allocation | Member participation in vetted budget decisions | Sufficient active participation; conflict, concentration and dispute rules tested |

Measure paid-user retention, net revenue after incentives, service contribution margins, cost of membership benefits, challenge completion and participant return after rewards end. Track genuine independent market activity separately from related-party activity. Publish minting/unlocks, treasury releases and purchases separately; gross token purchases alone do not describe net supply pressure.

Stop or reduce a programme when its approved budget is exhausted, manipulation is detected, reserves fall below policy or delivery costs exceed the funded allowance. Honour obligations already sold or committed and communicate changes prospectively.

## 13. Decisions required before implementation

- Reconcile total and circulating supply, treasury inventory, holder concentration, liquidity, vesting, unlocks and existing commitments.
- Choose credit service prices, free limits, allowance costs and membership activation threshold.
- Define credit expiration/refunds, income recognition and restricted-fund accounting.
- Choose pricing sources, membership-lock design and existing-member transition terms.
- Verify platform fee recipients and lifecycle splits across DBC, graduated pools and Flash; do not assume fee discounts can alter external protocol charges.
- Set reserve coverage, cost allocations and deficit treatment.
- Set treasury custody, purchase limits, token lock/release rules and reporting owners.
- Review the proposed sale, membership, custody, reward and treasury terms for applicable obligations before launch; this document makes no legal classification.

## 14. Research informing the design

Sources reviewed in the preceding design discussion on 2026-09-20. Mechanisms can change; recheck before implementing integrations. These are design references, not evidence of guaranteed returns.

| Reference | Lesson adopted | Boundary |
| --- | --- | --- |
| [Hyperliquid fees](https://hyperliquid.gitbook.io/hyperliquid-docs/trading/fees) | Link token purchases to actual product fees | Purchases cannot replace product demand |
| [Helium Data Credits](https://docs.helium.com/tokens/data-credit/) and [HNT mechanics](https://docs.helium.com/tokens/hnt-token/) | Predictable service pricing despite token volatility | Assess emissions and obligations alongside burns |
| [Render token model](https://know.rendernetwork.com/basics/the-render-spl-token) | Connect paid work with a service-credit model | Provider costs still need funding |
| [Pendle incentives](https://docs.pendle.finance/pendle-v2/ProtocolMechanics/Mechanisms/Incentives) and [sPENDLE](https://docs.pendle.finance/pendle-v2/ProtocolMechanics/Mechanisms/sPENDLE) | Cap rewards and measure useful contributions | Do not copy outdated vePENDLE descriptions or reward manufactured activity |
| [Curve governance history](https://news.curve.finance/five-years-of-curve-dao-2/) | Allocation rights matter when a scarce resource exists | Concentration and conflicts need explicit controls |
| [Intuition bonding curves](https://www.docs.intuition.systems/docs/intuition-concepts/economics/bonding-curves) | Public ideas can attract participation and sharing | Price appreciation is not independent revenue or truth |
| [Axie's February 2022 economic review](https://blog.axieinfinity.com/p/upcoming-season-20-and-economic-balancing) | Avoid routine reward issuance unsupported by demand | Historical caution, not a claim about its present economy |
| [Meteora DBC](https://github.com/MeteoraAg/dynamic-bonding-curve) | Creator/partner fees are configurable | Verify actual deployed recipients and graduation settings |

The proposed combination is predictable service pricing, capped contribution rewards, surplus-funded token purchases and social participation around stock-paired ideas.
