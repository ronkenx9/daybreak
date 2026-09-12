'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Flag, Ban, Send, Check } from 'lucide-react';
import { authedFetch } from '@/lib/account/api-client';
import { useAccountState } from './AccountProvider';
import { TOKENS } from '@/lib/base/tokens';
import { Avatar, StockIcon } from './Identity';

interface Discovery {
  id: string; subjectType: string; subjectId: string; subjectLabel: string | null;
  note: string | null; createdAt: string; authorName: string | null; authorAvatar: number | null;
  isMine: boolean; savedByMe: boolean;
}

// The circle's real shared-discovery feed: members post an asset + note, others
// save/report/block. Auth + membership gated; nothing here is sample data.
export default function CircleDiscoveries({ slug, isMember, onJoin, tickers }: { slug: string; isMember: boolean; onJoin: () => void; tickers?: string[] }) {
  const { authenticated } = useAccountState();
  const qc = useQueryClient();
  const key = ['discoveries', slug];
  const q = useQuery({ queryKey: key, queryFn: () => authedFetch<{ discoveries: Discovery[] }>(`/api/discoveries?circle=${slug}`), enabled: authenticated && isMember, retry: false });
  const available = tickers?.length ? TOKENS.filter((token) => tickers.includes(token.ticker)) : TOKENS;
  const [ticker, setTicker] = useState(available[0]?.ticker ?? TOKENS[0].ticker);
  useEffect(() => { setTicker(available[0]?.ticker ?? TOKENS[0].ticker); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const [note, setNote] = useState('');
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const share = useMutation({ mutationFn: () => authedFetch('/api/discoveries', { method: 'POST', body: JSON.stringify({ circleSlug: slug, subjectType: 'stock', subjectId: ticker, subjectLabel: TOKENS.find((t) => t.ticker === ticker)?.name, note }) }), onSuccess: () => { setNote(''); inv(); } });
  const save = useMutation({ mutationFn: (id: string) => authedFetch('/api/discoveries/save', { method: 'POST', body: JSON.stringify({ discoveryId: id }) }), onSuccess: inv });
  const unsave = useMutation({ mutationFn: (id: string) => authedFetch(`/api/discoveries/save?discoveryId=${id}`, { method: 'DELETE' }), onSuccess: inv });
  const report = useMutation({ mutationFn: (id: string) => authedFetch('/api/discoveries/report', { method: 'POST', body: JSON.stringify({ discoveryId: id, reason: 'reported' }) }), onSuccess: inv });
  const block = useMutation({ mutationFn: (id: string) => authedFetch('/api/discoveries/block', { method: 'POST', body: JSON.stringify({ discoveryId: id }) }), onSuccess: inv });
  const remove = useMutation({ mutationFn: (id: string) => authedFetch(`/api/discoveries?id=${id}`, { method: 'DELETE' }), onSuccess: inv });

  if (!authenticated) return <section className="db-disc"><div className="db-disc-empty"><h3>Share what you find.</h3><p>Sign in and join this circle to post discoveries and see what members are sharing.</p></div></section>;
  if (!isMember) return <section className="db-disc"><div className="db-disc-empty"><h3>Join to see discoveries.</h3><p>Save this circle to share assets with a note and see what others are watching.</p><button className="db-button db-blue-button" onClick={onJoin}>Save this circle</button></div></section>;

  return <section className="db-disc" aria-label="Circle discoveries">
    <div className="db-disc-composer">
      <label className="sr-only" htmlFor="disc-stock">Stock to share</label>
      <select id="disc-stock" value={ticker} onChange={(e) => setTicker(e.target.value)}>{available.map((t) => <option key={t.ticker} value={t.ticker}>{t.ticker} · {t.name}</option>)}</select>
      <input aria-label="Note" placeholder="Add a note — why is this worth a look?" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="db-button db-blue-button" disabled={share.isPending} onClick={() => share.mutate()}><Send size={15} /> {share.isPending ? 'Sharing…' : 'Share'}</button>
    </div>
    {share.isError && <p role="status" className="db-small-note">That couldn’t be shared. Please try again.</p>}
    {q.isPending && <p role="status" className="db-small-note">Loading discoveries…</p>}
    {q.isError && <p role="status" className="db-small-note">Discoveries are unavailable right now.</p>}
    {q.data && q.data.discoveries.length === 0 && <p className="db-small-note">No discoveries yet — be the first to share one.</p>}
    <div className="db-disc-list">{q.data?.discoveries.map((d) => <article key={d.id} className="db-disc-item">
      <Avatar seed={d.authorAvatar ?? 0} size={40} />
      <div className="db-disc-body">
        <div className="db-disc-head"><strong>{d.authorName || 'A member'}</strong><span>{new Date(d.createdAt).toLocaleDateString()}</span></div>
        <div className="db-disc-subject"><StockIcon ticker={d.subjectId} size={28} /><span>{d.subjectLabel || d.subjectId}</span></div>
        {d.note && <p>{d.note}</p>}
        <div className="db-disc-actions">
          <button aria-pressed={d.savedByMe} onClick={() => (d.savedByMe ? unsave : save).mutate(d.id)}>{d.savedByMe ? <><Check size={14} /> Saved</> : <><Bookmark size={14} /> Save</>}</button>
          {d.isMine
            ? <button onClick={() => remove.mutate(d.id)}>Remove</button>
            : <><button onClick={() => report.mutate(d.id)}><Flag size={14} /> Report</button><button onClick={() => block.mutate(d.id)}><Ban size={14} /> Block</button></>}
        </div>
      </div>
    </article>)}</div>
    <p className="db-small-note">Discoveries are visible to this circle’s members. Saving copies it to your own collection. Reports go to moderation; blocking hides that member from you.</p>
  </section>;
}
