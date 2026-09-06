export const accountQueryKey = (identity: string | null) => ['account', identity ?? 'anonymous'] as const;
