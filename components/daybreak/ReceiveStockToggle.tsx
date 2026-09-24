'use client';
import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/account/api-client';

/** "Let my circles send me stock": the one switch that shares your verified wallet with
 * members of circles you're in, so they can send you xStocks on X Layer. Off by default. */
export default function ReceiveStockToggle({ onChange }: { onChange?: (enabled: boolean) => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { authedFetch<{ enabled: boolean }>('/api/me/receive').then((r) => setEnabled(r.enabled)).catch(() => setEnabled(null)); }, []);
  if (enabled === null) return null;
  const toggle = async (next: boolean) => {
    setBusy(true); setError('');
    try { const r = await authedFetch<{ enabled: boolean }>('/api/me/receive', { method: 'POST', body: JSON.stringify({ enabled: next }) }); setEnabled(r.enabled); onChange?.(r.enabled); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update this setting'); }
    finally { setBusy(false); }
  };
  return <>
    <label className="db-receive-toggle"><input type="checkbox" checked={enabled} disabled={busy} onChange={(e) => void toggle(e.target.checked)}/><span><strong>Let my circles send me stock</strong><small>Members of circles you’re in can send xStocks to your verified wallet on X Layer. Your wallet is never shown in member lists. Turn off anytime.</small></span></label>
    {error && <p className="db-trade-error" role="alert">{error}</p>}
  </>;
}
