// Auth is off until a Privy app ID is provided. Without it the app runs fully
// anonymous — discovery, prices and read-only holdings all work; only the
// account features stay dormant. Set NEXT_PUBLIC_PRIVY_APP_ID to switch it on.
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';
export const isAuthConfigured = PRIVY_APP_ID.length > 0;
