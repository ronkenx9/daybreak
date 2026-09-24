import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';

const XLAYER_RPC = process.env.XLAYER_RPC_URL || 'https://rpc.xlayer.tech';
const key = process.env.XLAYER_DEPLOYER_KEY;

const config: HardhatUserConfig = {
  solidity: { version: '0.8.28', settings: { optimizer: { enabled: true, runs: 500 }, evmVersion: 'cancun' } },
  paths: { sources: './src' },
  networks: {
    // Tests fork X Layer mainnet so they run against the issuer's real xStocks and wrappers.
    hardhat: { chainId: 196, forking: { url: XLAYER_RPC, ...(process.env.FORK_BLOCK ? { blockNumber: Number(process.env.FORK_BLOCK) } : {}) } },
    xlayer: { url: XLAYER_RPC, chainId: 196, accounts: key ? [key] : [] },
  },
  mocha: { timeout: 300000 },
};
export default config;
