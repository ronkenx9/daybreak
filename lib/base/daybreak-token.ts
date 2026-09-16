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

// Whole DAYC required to unlock the member tier (badge + perks). Config knob:
// at ~$4.8e-7 this is roughly $0.24 of DAYC. Client-safe (no server-only import).
export const DAYC_MEMBER_MIN = 500_000;

// Circle-pin sink: spending DAYC pins a circle to the top of the homepage for a
// window; the tokens go to the treasury. Config knobs (client-safe).
export const DAYC_PIN_PRICE = 100_000; // whole DAYC to pin a circle
export const DAYC_PIN_HOURS = 48; // how long a pin lasts
// Treasury wallet that receives pin payments. The pin feature refuses to move
// funds unless this is a real 0x address (never the zero placeholder).
export const DAYC_TREASURY = '0xbF676Ef8A8886cd217265fD534987344ea0cc84B' as `0x${string}`;
export const isPinSinkConfigured = /^0x[0-9a-fA-F]{40}$/.test(DAYC_TREASURY) && DAYC_TREASURY !== '0x0000000000000000000000000000000000000000';
