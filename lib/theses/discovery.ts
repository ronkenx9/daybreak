export function pageNumber(value: string | null) {
  const page = Number(value ?? 0);
  if (!Number.isSafeInteger(page) || page < 0 || page > 100_000) throw new Error('Invalid page');
  return page;
}
export function thesisDiscovery(search: URLSearchParams) {
  const mode = search.get('mode') ?? 'all';
  if (!['all', 'paper', 'live'].includes(mode)) throw new Error('Invalid market type');
  const query = (search.get('q') ?? '').trim().slice(0, 100).replace(/[\\%_]/g, '\\$&');
  const page = pageNumber(search.get('page'));
  const actorKind = search.get('actor') ?? 'all';
  if (!['all', 'human', 'agent'].includes(actorKind)) throw new Error('Invalid participant type');
  return { mode, query, actorKind, offset: page * 40 };
}
