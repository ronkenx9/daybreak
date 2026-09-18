import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const registry = read('lib/theses/instruments.ts');
const trade = read('lib/solana/dbc/trade.ts');
const quote = read('app/api/theses/[id]/quote/route.ts');
const submit = read('app/api/theses/[id]/trade/route.ts');
const schema = read('lib/db/schema.ts');
const migration = read('drizzle/0017_thesis_markets.sql');

assert.match(registry, /SOLANA_XSTOCK_INSTRUMENTS\.map/);
assert.match(registry, /lifecycle: \{ create: true, buy: true, sell: true/);
assert.match(trade, /instrument\.mint !== identity\.quoteMint/);
assert.match(trade, /baseMint\.equals\(new PublicKey\(identity\.baseMint\)\)/);
assert.match(trade, /quoteMint\.equals\(new PublicKey\(identity\.quoteMint\)\)/);
assert.match(trade, /isMigrated !== 0/);
assert.match(trade, /getTransferFeeConfig/);
assert.match(trade, /getPausableConfig/);
assert.match(trade, /getTransferHook/);
assert.match(trade, /SwapMode\.ExactIn/);
assert.match(trade, /minimumAmountOut: new BN\(quote\.minimumOutputRaw\)/);
assert.match(quote, /await displayAmountToRaw\(inputMint, amount, inputDecimals\)/);
assert.match(quote, /rawAmountToDisplay\(build\.outputMint, build\.expectedOutputRaw\)/);
assert.match(trade, /uiAmountToAmountForMintWithoutSimulation/);
assert.match(trade, /amountToUiAmountForMintWithoutSimulation/);
assert.match(quote, /recordThesisTradePreview/);
assert.match(quote, /transactionMessageHash/);
assert.match(submit, /requireUserOwningSolanaWallet/);
assert.match(submit, /transactionMessageHash\(transaction\.serializeMessage\(\)\) !== stored\.quote\.transactionMessageHash/);
assert.match(submit, /transaction\.verifySignatures\(true\)/);
assert.match(submit, /claimThesisTrade/);
assert.match(submit, /status: 'unknown'/);
assert.match(schema, /thesisTradeQuotes/);
assert.match(migration, /ALTER TABLE "thesis_trade_quotes" ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /REVOKE ALL ON TABLE[\s\S]*"thesis_trade_quotes" FROM PUBLIC, anon, authenticated/);

console.log('thesis trading verified');
