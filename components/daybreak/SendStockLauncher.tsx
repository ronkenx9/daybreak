'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Gift, LoaderCircle, Users, X } from 'lucide-react';
import Dialog from './Dialog';
import { ProfileAvatar } from './Identity';
import SendStock from './SendStock';
import { authedFetch } from '@/lib/account/api-client';

interface CircleRow { slug: string; name: string; joined: boolean; memberCount: number }
interface MemberRow { memberRef: string; isYou: boolean; canReceive: boolean; displayName: string; handle: string | null; avatar: number; avatarUrl: string | null }

/** Pick who to send stock to: a circle (skipped when `slug` is given), then a member who
 * receives stock, then the send flow itself. */
export default function SendStockLauncher({ slug: fixedSlug, onClose }: { slug?: string; onClose: () => void }) {
  const [slug, setSlug] = useState<string | null>(fixedSlug ?? null);
  const [circles, setCircles] = useState<CircleRow[] | null>(null);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [target, setTarget] = useState<MemberRow | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { if (fixedSlug) return; authedFetch<{ circles: CircleRow[] }>('/api/circles').then((r) => setCircles(r.circles.filter((c) => c.joined))).catch(() => setError('Your circles could not be loaded.')); }, [fixedSlug]);
  useEffect(() => { if (!slug) return; setMembers(null); authedFetch<{ members: MemberRow[] }>(`/api/circles/members?slug=${encodeURIComponent(slug)}`).then((r) => setMembers(r.members.filter((m) => !m.isYou))).catch(() => setError('This circle’s members could not be loaded.')); }, [slug]);

  if (slug && target) return <SendStock slug={slug} memberRef={target.memberRef} memberName={target.displayName} onClose={onClose}/>;
  const receivers = members?.filter((m) => m.canReceive) ?? [];
  const others = members?.filter((m) => !m.canReceive) ?? [];
  const circleName = circles?.find((c) => c.slug === slug)?.name;

  return <Dialog wide label="Send stock" onClose={onClose}>
    <div className="db-dialog-top"><span className="db-eyebrow"><Gift size={13}/> Send stock</span><button aria-label="Close" className="db-icon-button" onClick={onClose}><X size={18}/></button></div>
    {error ? <p className="db-trade-error" role="alert">{error}</p>
      : !slug ? <div className="db-send-pick">
          <h3>Which circle?</h3>
          {circles === null ? <p className="db-small-note"><LoaderCircle className="db-spin" size={14}/> Loading your circles…</p>
            : circles.length === 0 ? <p className="db-small-note">Join a circle first. You can send stock to members of circles you’re in.</p>
            : <div className="db-send-pick-list">{circles.map((c) => <button key={c.slug} onClick={() => setSlug(c.slug)}><Users size={16}/><span className="db-send-pick-text"><strong>{c.name}</strong><small>{c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}</small></span><ArrowRight size={15}/></button>)}</div>}
        </div>
      : <div className="db-send-pick">
          <h3>Send to{circleName ? ` someone in ${circleName}` : ''}</h3>
          {!fixedSlug && <button className="db-text-link" onClick={() => { setSlug(null); setMembers(null); }}>Change circle</button>}
          {members === null ? <p className="db-small-note"><LoaderCircle className="db-spin" size={14}/> Loading members…</p>
            : receivers.length === 0 ? <p className="db-small-note">No one here receives stock yet. Members turn on “Let my circles send me stock” in their circle or on their profile.</p>
            : <div className="db-send-pick-list">{receivers.map((m) => <button key={m.memberRef} onClick={() => setTarget(m)}><ProfileAvatar imageUrl={m.avatarUrl} seed={m.avatar} size={34}/><span className="db-send-pick-text"><strong>{m.displayName}</strong><small>{m.handle || 'Member'}</small></span><ArrowRight size={15}/></button>)}</div>}
          {others.length > 0 && <p className="db-small-note">{others.length} other {others.length === 1 ? 'member hasn’t' : 'members haven’t'} turned on receiving.</p>}
        </div>}
  </Dialog>;
}
