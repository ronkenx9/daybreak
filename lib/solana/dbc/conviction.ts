import 'server-only';
import { buildLaunchTransaction, type LaunchBuild } from './launch';
import { fetchPreStocks } from '@/lib/providers/prestocks';
import { prestockBySymbol } from '@/lib/solana/prestocks-registry';

// Conviction Curves — a belief market for a pre-IPO name, built on Meteora DBC.
//
// Why not quote-pair against the PreStocks token itself? Verified on-chain: PreStocks
// mints are Token-2022 with a transfer fee, transfer hook and pausable config, and no
// DBC token badge exists for them — so they cannot be a DBC quote mint, and a transfer
// fee would break pool accounting anyway. Instead the belief token launches on a normal
// USDC-quoted equity-tuned curve, and two things tie it to PreStocks:
//   1. The price band is ANCHORED to the pre-IPO name's live implied valuation, so a
//      bigger company gets a bigger belief pool.
//   2. Participation is HOLDER-GATED at the app layer: only wallets holding the pre-IPO
//      token can launch or buy (verified via the Solana holdings reader). That drives
//      real demand to PreStocks — you must own the asset to join its belief market.

// Map a pre-IPO implied valuation (often hundreds of billions) to a sane community-token
// reference cap, clamped so the DBC band stays reasonable. Bigger company -> bigger pool.
const MIN_REF = 10_000;   // USDC
const MAX_REF = 500_000;  // USDC
export function convictionReference(impliedValuationUsd: number | null): number {
  if (!impliedValuationUsd || !Number.isFinite(impliedValuationUsd) || impliedValuationUsd <= 0) return MIN_REF;
  return Math.min(MAX_REF, Math.max(MIN_REF, Math.round(impliedValuationUsd / 1_000_000)));
}

// Belief-token identity from the pre-IPO name.
function beliefName(company: string): string { return `${company} Believers`.slice(0, 32); }
function beliefSymbol(symbol: string): string { return (symbol.slice(0, 6) + 'BLV').slice(0, 10); }

export interface ConvictionBuild extends LaunchBuild {
  prestock: { symbol: string; company: string; mint: string; impliedValuation: number | null; tokenPrice: number | null };
  referenceValuationUsd: number;
  name: string; symbol: string;
}

// Build the conviction-curve launch transaction for a pre-IPO symbol. The creator must
// already hold the pre-IPO token (enforced at the API/app layer before this runs) and
// signs the returned transaction as fee payer.
export async function buildConvictionLaunch(creator: string, prestockSymbol: string): Promise<ConvictionBuild> {
  const reg = prestockBySymbol(prestockSymbol);
  if (!reg) throw new Error('Unknown pre-IPO symbol');
  const { items } = await fetchPreStocks();
  const quote = items.find((q) => q.symbol === reg.symbol);
  const impliedValuation = quote?.impliedValuation ?? null;
  const tokenPrice = quote?.tokenPrice ?? null;
  const referenceValuationUsd = convictionReference(impliedValuation);
  const name = beliefName(reg.company);
  const symbol = beliefSymbol(reg.symbol);

  const build = await buildLaunchTransaction({
    creator, name, symbol,
    uri: `https://www.daybreakcircles.lol/api/dbc/metadata?belief=${reg.symbol}`,
    referenceValuationUsd,
  });

  return {
    ...build, name, symbol, referenceValuationUsd,
    prestock: { symbol: reg.symbol, company: reg.company, mint: reg.mint, impliedValuation, tokenPrice },
  };
}
