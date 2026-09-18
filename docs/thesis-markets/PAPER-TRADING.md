# Conviction public paper markets

Paper mode is a public social simulation for stock-paired theses. A signed-in Daybreak member chooses any supported xStock, writes the thesis, and names its paper token. Publication creates one shared constant-product curve and places the thesis in the same Conviction discovery feed as live markets, clearly labelled **Paper**.

Every participant receives a simulated allocation of 10 units for each stock instrument when they first trade it. That stock balance is shared across paper theses using the same instrument. All paper balances, positions, Back/Sell activity, curve movement, realized and unrealized P/L are public. The market page polls the shared state and shows a public conviction leaderboard and activity ledger, so early participation and subsequent demand are visible to everyone.

Paper mutations require Daybreak sign-in so trades and positions have a stable public identity and server-side rate limits. They never connect a wallet, request a signature, construct a blockchain transaction, or move a real stock token. The server serializes trades against the paper-market row and updates the curve, stock balance, position and public ledger atomically.

The simulator uses a 2% paper fee and constant-product curve to teach demand, price impact, average entry, market value and P/L. It does not imitate a live pool quote or claim that paper performance predicts a live result. Live theses remain distinct and expose their verified onchain pair and transaction review.
