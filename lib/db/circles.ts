// Canonical circles, mirrored from the app's UI groups. Membership references
// these stable slugs — never a numeric index into a UI array.
export const CIRCLES = [
  { slug: 'the-everyday-club', name: 'The everyday club', description: 'Familiar companies. Fresh perspectives.', tickers: ['AAPL', 'AMZN'] },
  { slug: 'built-for-tomorrow', name: 'Built for tomorrow', description: 'Computing, chips and the next big questions.', tickers: ['NVDA', 'AAPL'] },
  { slug: 'after-hours-people', name: 'After-hours people', description: 'The games and stories we come back to.', tickers: ['META'] },
] as const;

export const CIRCLE_SLUGS: readonly string[] = CIRCLES.map((c) => c.slug);
export type CircleSlug = (typeof CIRCLES)[number]['slug'];
