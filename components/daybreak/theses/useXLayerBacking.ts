'use client';
import { useQuery } from '@tanstack/react-query';
import { useAccountState } from '../AccountProvider';
import { XLAYER_STOCKS, type XLayerStock } from '@/lib/xlayer/tokens';
import type { VaultThesis } from '@/lib/xlayer/vault';

export const xlayerStockForCompany = (companyId: string): XLayerStock | null => XLAYER_STOCKS.find((s) => s.companyId === companyId) ?? null;

/** Reads the vault once and resolves each Daybreak thesis to its canonical vault entry.
 * Anyone can open a vault entry pointing at a thesis URL, so an entry only counts when its
 * xStock matches the thesis's company. Among matches, the earliest still-open entry wins
 * (else the most recent ended one). */
export function useXLayerBacking() {
  const account = useAccountState();
  const wallet = account.user?.wallet ?? null;
  const query = useQuery({
    queryKey: ['xlayer-theses', wallet], staleTime: 20_000, refetchInterval: 60_000, retry: 1,
    queryFn: async ({ signal }) => { const r = await fetch(`/api/xlayer/theses${wallet ? `?backer=${wallet}` : ''}`, { signal, cache: 'no-store' }); if (!r.ok) throw new Error('unavailable'); return r.json() as Promise<{ theses: VaultThesis[] }>; },
  });
  const backingFor = (slug: string, companyId: string): VaultThesis | null => {
    const stock = xlayerStockForCompany(companyId);
    if (!stock) return null;
    let pick: VaultThesis | null = null;
    for (const t of [...(query.data?.theses ?? [])].sort((a, b) => a.id - b.id)) {
      if (t.thesisSlug !== slug || t.wrapper !== stock.wrapper) continue;
      if (!pick || (pick.expired && !t.expired) || (pick.expired && t.expired)) pick = t;
    }
    return pick;
  };
  return { backingFor, query, wallet };
}
