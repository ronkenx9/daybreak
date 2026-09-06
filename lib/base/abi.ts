/** Minimal ABIs for reading Base tokenized stocks. Read-only fragments only. */

// B20 Asset token. `scaledBalanceOf` applies the current multiplier, so it
// reflects real underlying shares after splits/corporate actions — always
// prefer it over raw balanceOf when showing a holding.
export const b20Abi = [
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'scaledBalanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'multiplier', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

// Chainlink AggregatorV3. Prices are Total Return values (the multiplier is
// already baked in). Always check `updatedAt` for staleness before relying.
export const chainlinkFeedAbi = [
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'description', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  {
    type: 'function', name: 'latestRoundData', stateMutability: 'view', inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
] as const;

// BaseScan verified source for the oracle registry, checked 2026-09-06.
export const oracleRegistryAbi = [{type:'function',name:'getOracleParams',stateMutability:'view',inputs:[{name:'token',type:'address'}],outputs:[{name:'multiplier',type:'uint256'},{name:'paused',type:'bool'}]}] as const;
