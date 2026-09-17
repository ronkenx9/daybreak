import 'server-only';
import {
  buildCurveWithMarketCap,
  ActivationType, BaseFeeMode, CollectFeeMode, MigrationOption, MigrationFeeOption,
  TokenType, TokenDecimal, TokenAuthorityOption,
  type ConfigParameters,
} from '@meteora-ag/dynamic-bonding-curve-sdk';

// Daybreak's EQUITY-TUNED Dynamic Bonding Curve config.
//
// Meteora DBC is normally configured for memecoins. This config is tuned for
// equity-like assets (a community token themed to a stock / pre-IPO name), which is
// the Meteora bounty's ask. Three deliberate choices differ from a meme launch:
//
// 1. Reference-anchored price band. Instead of an arbitrary market cap, the launch
//    is anchored to a real reference: for a listed name we pass the live oracle-implied
//    market cap; for a pre-IPO name we pass the PreStocks implied valuation. The curve
//    starts at `initialMarketCap` and graduates at `migrationMarketCap`, both derived
//    from that reference (see equityMarketCaps). This gives thin/newly tokenized pairs
//    a sane price band rather than a random one.
// 2. IPO-style decaying fee. An exponential fee scheduler starts high and decays to a
//    low steady-state fee, mimicking IPO stabilization and taxing snipers on thin books
//    at open. (Memecoin curves usually run a flat low fee.)
// 3. Graduation into real liquidity. Migration goes to Meteora DAMM v2, so a graduated
//    equity token lands in a proper AMM pool, not a dead curve.
//
// Everything here is a pure function over numbers, so the resulting ConfigParameters
// are deterministic and unit-checkable (see DBC-GATES).

export const DBC_PROGRAM_ID = 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN';

// Equity-tuned defaults. Fees in bps; durations in seconds.
export const EQUITY_DBC_DEFAULTS = {
  totalTokenSupply: 1_000_000_000, // 1B community token supply
  startingFeeBps: 500,   // 5.0% at open — IPO-style stabilization / anti-snipe
  endingFeeBps: 100,     // 1.0% steady state
  feeDecayPeriods: 120,  // number of scheduler steps
  feeDecaySeconds: 3600, // decay completes ~1h after activation
  creatorTradingFeePercentage: 50, // creator takes half of trading fees
  migrationFeeBps: MigrationFeeOption.FixedBps100, // 1% migration fee tier
  // Price band as a multiple of the reference market cap. Launch below reference so
  // the curve discovers up toward it; graduate above so DAMM v2 liquidity forms around it.
  initialCapMultiple: 0.5,
  migrationCapMultiple: 5,
} as const;

// Derive the DBC market-cap band (in quote units, e.g. USDC) from a real reference
// valuation. Anchoring both ends to the reference is the equity-specific behaviour.
export function equityMarketCaps(referenceValuationUsd: number): { initialMarketCap: number; migrationMarketCap: number } {
  if (!Number.isFinite(referenceValuationUsd) || referenceValuationUsd <= 0) {
    throw new Error('referenceValuationUsd must be a positive number');
  }
  return {
    initialMarketCap: Math.round(referenceValuationUsd * EQUITY_DBC_DEFAULTS.initialCapMultiple),
    migrationMarketCap: Math.round(referenceValuationUsd * EQUITY_DBC_DEFAULTS.migrationCapMultiple),
  };
}

export interface EquityCurveInput {
  // A real reference valuation in USD for the community token's price band. For a
  // listed name use the oracle-implied cap; for a pre-IPO name use the PreStocks
  // implied valuation (scaled to a sensible community-token cap by the caller).
  referenceValuationUsd: number;
  totalTokenSupply?: number;
  quoteDecimals?: 6 | 9; // USDC = 6
}

// Build the equity-tuned ConfigParameters. Validated by the SDK before return, so a
// bad input throws here rather than at pool-creation time on-chain.
export function buildEquityCurve(input: EquityCurveInput): ConfigParameters {
  const d = EQUITY_DBC_DEFAULTS;
  const { initialMarketCap, migrationMarketCap } = equityMarketCaps(input.referenceValuationUsd);
  const quoteDecimal = (input.quoteDecimals ?? 6) === 9 ? TokenDecimal.NINE : TokenDecimal.SIX;

  const config = buildCurveWithMarketCap({
    token: {
      tokenType: TokenType.Token2022, // match the xStocks / PreStocks Token-2022 ecosystem
      tokenBaseDecimal: TokenDecimal.NINE,
      tokenQuoteDecimal: quoteDecimal,
      tokenAuthorityOption: TokenAuthorityOption.CreatorUpdateAuthority,
      totalTokenSupply: input.totalTokenSupply ?? d.totalTokenSupply,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerExponential, // high -> low IPO-style decay
        feeSchedulerParam: {
          startingFeeBps: d.startingFeeBps,
          endingFeeBps: d.endingFeeBps,
          numberOfPeriod: d.feeDecayPeriods,
          totalDuration: d.feeDecaySeconds,
        },
      },
      dynamicFeeEnabled: true, // extra fee on volatility — sensible for equity opens
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: d.creatorTradingFeePercentage,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2, // graduate into DAMM v2 liquidity
      migrationFeeOption: d.migrationFeeBps,
      migrationFee: { feePercentage: 1, creatorFeePercentage: 50 },
    },
    liquidityDistribution: {
      // DBC requires >=10% of migration liquidity permanently locked. Locking 10%
      // on the creator side seeds durable post-graduation liquidity for the equity
      // token rather than letting all of it be withdrawable.
      partnerPermanentLockedLiquidityPercentage: 0,
      partnerLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 10,
      creatorLiquidityPercentage: 90,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0, numberOfVestingPeriod: 0, cliffUnlockAmount: 0,
      totalVestingDuration: 0, cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
    initialMarketCap,
    migrationMarketCap,
  });

  // buildCurveWithMarketCap is the SDK's authoritative builder; its output is the
  // canonical ConfigParameters passed straight into createConfigAndPool. The remaining
  // structural params here are fixed constants that satisfy DBC's rules (>=10% locked
  // migration liquidity, fee bounds 25..9900 bps, DAMM v2 migration), so the only
  // variable is referenceValuationUsd, guarded above. Final on-chain validation happens
  // when the creator's launch transaction is simulated before signing (see launch.ts).
  return config;
}
