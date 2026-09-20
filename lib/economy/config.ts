export function economyReviewConfigured() {
  return (process.env.DAYBREAK_ECONOMY_ADMIN_DIDS || '').split(',').some(value => value.trim().startsWith('did:privy:'));
}
