export const accountQueryKey = (identity: string | null) => ['account', identity ?? 'anonymous'] as const;
export const briefingQueryKey = (identity: string | null) => ['holdings-briefing', identity ?? 'anonymous'] as const;
