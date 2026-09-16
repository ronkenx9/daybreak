import 'server-only';
import { Connection } from '@solana/web3.js';

// Solana mainnet read client. Override with SOLANA_RPC_URL (the public endpoint
// rate-limits under load; use a provider RPC in production).
export const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

let conn: Connection | null = null;
export function solanaConnection(): Connection {
  if (!conn) conn = new Connection(SOLANA_RPC_URL, 'confirmed');
  return conn;
}
