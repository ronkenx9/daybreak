'use client';
import { Lock } from 'lucide-react';
import { useXLayerBacking } from './useXLayerBacking';

const fmt = (v: string) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 4 });

/** On-chain proof on a thesis card: real xStocks locked behind it on X Layer. Renders nothing
 * until someone has actually locked stock. */
export default function XLayerBackingBadge({ slug, companyId }: { slug: string; companyId: string }) {
  const { backingFor } = useXLayerBacking();
  const b = backingFor(slug, companyId);
  if (!b || Number(b.lockedStock) <= 0) return null;
  return <span className="db-xlayer-badge" title="Real xStocks locked behind this thesis in the Daybreak vault on X Layer">
    <Lock size={11}/> {fmt(b.lockedStock)} {b.symbol} locked · {b.backers} backer{b.backers === 1 ? '' : 's'}{b.expired ? ' · ended' : ''}
  </span>;
}
