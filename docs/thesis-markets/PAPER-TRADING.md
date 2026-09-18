# Conviction paper trading

Paper mode teaches the stock-paired thesis mechanic without authentication, a wallet, or funds. It runs entirely in the browser and stores its versioned practice account in local storage.

The first step is creation. A user chooses any supported xStock, writes a title and concise argument, and names the paper thesis token. Creating it opens an independent simulated curve market; it never publishes the thesis or reaches a live API. A user can create and switch among multiple paper theses, including several paired with the same stock token.

Each supported xStock starts with 10 simulated tokens shared across paper theses that use that instrument. Thesis-token positions, curve reserves, trades, and P/L remain isolated per thesis. Backing spends the selected stock token and receives that thesis's paper token. Selling reverses the exchange. The simulator uses a constant-product curve and the current 2% starting DBC fee to make demand, price impact, average entry, market value, and realized/unrealized P/L visible.

The simulator is educational. It does not fetch or imitate a live pool quote, construct a Solana transaction, connect a wallet, or claim that paper performance predicts a live result. Live execution remains in the verified market trade panel.
