export type CircleGateMode = 'open' | 'any_stock' | 'all_stocks';

export function circleGateEligible(mode: string, requiredTickers: string[], heldTickers: Iterable<string>) {
  if (mode === 'open') return true;
  if (!requiredTickers.length) return false;
  const held = new Set(heldTickers);
  return mode === 'all_stocks' ? requiredTickers.every((ticker) => held.has(ticker)) : requiredTickers.some((ticker) => held.has(ticker));
}
