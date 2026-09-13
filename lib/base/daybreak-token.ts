// The Daybreak community token (DAYC) on Base. Verified on-chain 2026-09-13:
// name "Daybreak", symbol DAYC, 18 decimals, 100B supply. Live Uniswap DAYC/WETH pool.
export const DAYBREAK_TOKEN = {
  address: '0x2542042deb8578452c26b092f916cf7da81bdba3' as `0x${string}`,
  symbol: 'DAYC',
  name: 'Daybreak',
  decimals: 18,
  pairUrl: 'https://dexscreener.com/base/0x2542042deb8578452c26b092f916cf7da81bdba3',
  buyUrl: 'https://app.uniswap.org/swap?chain=base&outputCurrency=0x2542042deb8578452c26b092f916cf7da81bdba3',
  scanUrl: 'https://basescan.org/token/0x2542042deb8578452c26b092f916cf7da81bdba3',
} as const;
