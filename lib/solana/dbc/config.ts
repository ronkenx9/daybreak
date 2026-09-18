import 'server-only';
import {
  ActivationType, BaseFeeMode, CollectFeeMode, MigrationFeeOption, MigrationOption,
  TokenAuthorityOption, TokenDecimal, TokenType, buildCurveWithMarketCap,
  type ConfigParameters,
} from '@meteora-ag/dynamic-bonding-curve-sdk';

export const DBC_PROGRAM_ID = 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN';

// Versioned economic terms. Both caps are denominated in the exact quote stock
// token, never USD and never the underlying company's equity market cap.
export const THESIS_CURVE_V1 = {
  version: 'stock-quote-v1',
  baseDecimals: 6,
  initialMarketCapQuote: 100,
  migrationMarketCapQuote: 1_000,
  startingFeeBps: 200,
  endingFeeBps: 100,
  feeDecayPeriods: 120,
  feeDecaySeconds: 3_600,
  creatorTradingFeePercentage: 50,
  creatorPermanentLockedLiquidityPercentage: 100,
} as const;

function tokenDecimal(decimals: number): TokenDecimal {
  switch (decimals) {
    case 6: return TokenDecimal.SIX;
    case 8: return TokenDecimal.EIGHT;
    case 9: return TokenDecimal.NINE;
    default: throw new Error(`Unsupported DBC quote decimals: ${decimals}`);
  }
}

export interface ThesisCurveInput { quoteDecimals: number }

export interface ThesisCurveBuild {
  config: ConfigParameters;
  terms: {
    version: typeof THESIS_CURVE_V1.version;
    quoteDecimals: number;
    initialMarketCapQuote: number;
    migrationMarketCapQuote: number;
    supplyMode: 'dynamic';
    startingFeeBps: number;
    endingFeeBps: number;
    creatorTradingFeePercentage: number;
    migratedLiquidityPermanentLockedPct: number;
  };
}

export function buildThesisCurve(input: ThesisCurveInput): ThesisCurveBuild {
  const d = THESIS_CURVE_V1;
  const built = buildCurveWithMarketCap({
    token: {
      tokenType: TokenType.Token2022,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: tokenDecimal(input.quoteDecimals),
      tokenAuthorityOption: TokenAuthorityOption.CreatorUpdateAuthority,
      totalTokenSupply: 1_000_000_000,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerExponential,
        feeSchedulerParam: {
          startingFeeBps: d.startingFeeBps,
          endingFeeBps: d.endingFeeBps,
          numberOfPeriod: d.feeDecayPeriods,
          totalDuration: d.feeDecaySeconds,
        },
      },
      dynamicFeeEnabled: true,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: d.creatorTradingFeePercentage,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.FixedBps100,
      migrationFee: { feePercentage: 1, creatorFeePercentage: 50 },
    },
    liquidityDistribution: {
      partnerPermanentLockedLiquidityPercentage: 0,
      partnerLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: d.creatorPermanentLockedLiquidityPercentage,
      creatorLiquidityPercentage: 0,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0, numberOfVestingPeriod: 0, cliffUnlockAmount: 0,
      totalVestingDuration: 0, cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
    initialMarketCap: d.initialMarketCapQuote,
    migrationMarketCap: d.migrationMarketCapQuote,
  });

  // The deployed program's fixed-supply path requires a swap buffer the SDK's
  // market-cap builder does not include. Dynamic supply is the proven mode.
  const config = { ...built, tokenSupply: null } as ConfigParameters;
  return {
    config,
    terms: {
      version: d.version,
      quoteDecimals: input.quoteDecimals,
      initialMarketCapQuote: d.initialMarketCapQuote,
      migrationMarketCapQuote: d.migrationMarketCapQuote,
      supplyMode: 'dynamic',
      startingFeeBps: d.startingFeeBps,
      endingFeeBps: d.endingFeeBps,
      creatorTradingFeePercentage: d.creatorTradingFeePercentage,
      migratedLiquidityPermanentLockedPct: d.creatorPermanentLockedLiquidityPercentage,
    },
  };
}
