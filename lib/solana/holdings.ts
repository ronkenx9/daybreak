import 'server-only';
import { PublicKey } from '@solana/web3.js';
import { solanaConnection } from './client';
import { TOKEN_2022_PROGRAM_ID, XSTOCK_BY_MINT } from './xstocks-registry';

export interface SolanaHolding {
  ticker: string; company: string; xSymbol: string; mint: string; decimals: number;
  rawAmount: string;   // integer base units (unscaled)
  quantity: string;    // displayed quantity from the RPC (Scaled UI Amount applied)
}
export interface SolanaHoldingsSnapshot {
  address: string; chain: 'solana'; slot: number; observedAt: number;
  status: 'complete'; holdings: SolanaHolding[];
}

// Read a wallet's xStocks (Token-2022) balances on Solana. We enumerate token
// accounts under the Token-2022 program (never classic SPL), match mints against
// the verified registry, and use the RPC's Scaled-UI-Amount-aware quantity. Solana
// addresses are case-sensitive — never lowercase them.
export async function readSolanaXstockHoldings(address: string): Promise<SolanaHoldingsSnapshot> {
  const owner = new PublicKey(address); // throws on an invalid base58 address
  const programId = new PublicKey(TOKEN_2022_PROGRAM_ID);
  const conn = solanaConnection();
  const res = await conn.getParsedTokenAccountsByOwner(owner, { programId }, 'confirmed');

  // A wallet can hold several token accounts for the same mint — aggregate them.
  const agg = new Map<string, { raw: bigint; ui: number }>();
  for (const { account } of res.value) {
    const info = (account.data as { parsed?: { info?: Record<string, unknown> } }).parsed?.info;
    const mint = typeof info?.mint === 'string' ? info.mint : '';
    if (!mint || !XSTOCK_BY_MINT[mint]) continue; // only our verified xStocks
    const ta = info!.tokenAmount as { amount: string; uiAmount: number | null; uiAmountString?: string };
    const raw = BigInt(ta.amount || '0');
    const ui = Number(ta.uiAmountString ?? ta.uiAmount ?? 0);
    const prev = agg.get(mint) ?? { raw: 0n, ui: 0 };
    agg.set(mint, { raw: prev.raw + raw, ui: prev.ui + ui });
  }

  const holdings: SolanaHolding[] = [];
  for (const [mint, v] of agg) {
    if (v.raw === 0n) continue;
    const x = XSTOCK_BY_MINT[mint];
    holdings.push({
      ticker: x.ticker, company: x.company, xSymbol: x.xSymbol, mint, decimals: x.decimals,
      rawAmount: v.raw.toString(),
      quantity: v.ui.toLocaleString('en-US', { maximumFractionDigits: 6 }),
    });
  }
  holdings.sort((a, b) => a.ticker.localeCompare(b.ticker));
  return { address, chain: 'solana', slot: res.context.slot, observedAt: Date.now(), status: 'complete', holdings };
}
