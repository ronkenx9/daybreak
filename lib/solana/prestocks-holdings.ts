import 'server-only';
import { PublicKey } from '@solana/web3.js';
import { solanaConnection } from './client';
import { TOKEN_2022_PROGRAM_ID, PRESTOCK_BY_MINT } from './prestocks-registry';

export interface PreStockHolding {
  symbol: string; company: string; mint: string; decimals: number;
  rawAmount: string;  // integer base units (unscaled)
  quantity: string;   // displayed quantity from the RPC (Scaled UI Amount applied)
}
export interface PreStockHoldingsSnapshot {
  address: string; chain: 'solana'; slot: number; observedAt: number;
  status: 'complete'; holdings: PreStockHolding[];
}

// Read a wallet's PreStocks (Token-2022) balances on Solana. Same enumeration as
// the xStocks reader: list Token-2022 accounts, match verified PreStocks mints,
// use the RPC's Scaled-UI-Amount-aware quantity. Addresses are case-sensitive.
export async function readPreStockHoldings(address: string): Promise<PreStockHoldingsSnapshot> {
  const owner = new PublicKey(address); // throws on invalid base58
  const programId = new PublicKey(TOKEN_2022_PROGRAM_ID);
  const conn = solanaConnection();
  const res = await conn.getParsedTokenAccountsByOwner(owner, { programId }, 'confirmed');

  const agg = new Map<string, { raw: bigint; ui: number }>();
  for (const { account } of res.value) {
    const info = (account.data as { parsed?: { info?: Record<string, unknown> } }).parsed?.info;
    const mint = typeof info?.mint === 'string' ? info.mint : '';
    if (!mint || !PRESTOCK_BY_MINT[mint]) continue;
    const ta = info!.tokenAmount as { amount: string; uiAmount: number | null; uiAmountString?: string };
    const raw = BigInt(ta.amount || '0');
    const ui = Number(ta.uiAmountString ?? ta.uiAmount ?? 0);
    const prev = agg.get(mint) ?? { raw: 0n, ui: 0 };
    agg.set(mint, { raw: prev.raw + raw, ui: prev.ui + ui });
  }

  const holdings: PreStockHolding[] = [];
  for (const [mint, v] of agg) {
    if (v.raw === 0n) continue;
    const p = PRESTOCK_BY_MINT[mint];
    holdings.push({
      symbol: p.symbol, company: p.company, mint, decimals: p.decimals,
      rawAmount: v.raw.toString(),
      quantity: v.ui.toLocaleString('en-US', { maximumFractionDigits: 6 }),
    });
  }
  holdings.sort((a, b) => a.company.localeCompare(b.company));
  return { address, chain: 'solana', slot: res.context.slot, observedAt: Date.now(), status: 'complete', holdings };
}
