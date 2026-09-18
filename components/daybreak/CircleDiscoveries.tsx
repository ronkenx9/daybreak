'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Flag, Ban, Send, Check, Languages } from 'lucide-react';
import { authedFetch } from '@/lib/account/api-client';
import { useAccountState } from './AccountProvider';
import { TOKENS } from '@/lib/base/tokens';
import { ProfileAvatar, StockIcon } from './Identity';
import { useLocale } from './LocaleProvider';

interface Discovery {
  id: string; subjectType: string; subjectId: string; subjectLabel: string | null;
  note: string | null; createdAt: string; authorName: string | null; authorAvatar: number | null; authorAvatarUrl: string | null;
  isMine: boolean; savedByMe: boolean;
}

// The circle's real shared-discovery feed: members post an asset + note, others
// save/report/block. Auth + membership gated; nothing here is sample data.
export default function CircleDiscoveries({ slug, isMember, onJoin, tickers }: { slug: string; isMember: boolean; onJoin: () => void; tickers?: string[] }) {
  const { locale, t } = useLocale();
  const { authenticated } = useAccountState();
  const qc = useQueryClient();
  const key = ['discoveries', slug];
  const q = useQuery({ queryKey: key, queryFn: () => authedFetch<{ discoveries: Discovery[] }>(`/api/discoveries?circle=${slug}`), enabled: authenticated && isMember, retry: false });
  const available = tickers?.length ? TOKENS.filter((token) => tickers.includes(token.ticker)) : TOKENS;
  const [ticker, setTicker] = useState(available[0]?.ticker ?? TOKENS[0].ticker);
  useEffect(() => { setTicker(available[0]?.ticker ?? TOKENS[0].ticker); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const [note, setNote] = useState('');
  const [translations, setTranslations] = useState<Record<string, { text?: string; loading?: boolean; error?: boolean; shown?: boolean }>>({});
  const inv = () => qc.invalidateQueries({ queryKey: key });
  const share = useMutation({ mutationFn: () => authedFetch('/api/discoveries', { method: 'POST', body: JSON.stringify({ circleSlug: slug, subjectType: 'stock', subjectId: ticker, subjectLabel: TOKENS.find((t) => t.ticker === ticker)?.name, note }) }), onSuccess: () => { setNote(''); inv(); } });
  const save = useMutation({ mutationFn: (id: string) => authedFetch('/api/discoveries/save', { method: 'POST', body: JSON.stringify({ discoveryId: id }) }), onSuccess: inv });
  const unsave = useMutation({ mutationFn: (id: string) => authedFetch(`/api/discoveries/save?discoveryId=${id}`, { method: 'DELETE' }), onSuccess: inv });
  const report = useMutation({ mutationFn: (id: string) => authedFetch('/api/discoveries/report', { method: 'POST', body: JSON.stringify({ discoveryId: id, reason: 'reported' }) }), onSuccess: inv });
  const block = useMutation({ mutationFn: (id: string) => authedFetch('/api/discoveries/block', { method: 'POST', body: JSON.stringify({ discoveryId: id }) }), onSuccess: inv });
  const remove = useMutation({ mutationFn: (id: string) => authedFetch(`/api/discoveries?id=${id}`, { method: 'DELETE' }), onSuccess: inv });

  // Chat reads oldest -> newest, but the API returns newest first.
  const messages = q.data ? [...q.data.discoveries].reverse() : [];
  const threadRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);
  const send = () => { if (!note.trim() || share.isPending) return; share.mutate(); };
  const translate = async (message: Discovery) => {
    if (!message.note || locale === 'en') return;
    const cached = translations[message.id];
    if (cached?.text) { setTranslations((value) => ({ ...value, [message.id]: { ...cached, shown: !cached.shown } })); return; }
    setTranslations((value) => ({ ...value, [message.id]: { loading: true, shown: true } }));
    try {
      const result = await authedFetch<{ translation: string }>('/api/translate', { method: 'POST', body: JSON.stringify({ text: message.note, targetLocale: locale }) });
      setTranslations((value) => ({ ...value, [message.id]: { text: result.translation, shown: true } }));
    } catch {
      setTranslations((value) => ({ ...value, [message.id]: { error: true, shown: true } }));
    }
  };

  if (!authenticated) return <section className="db-chat"><div className="db-disc-empty"><h3>Join the conversation.</h3><p>Sign in and join this circle to chat and see what members are sharing.</p></div></section>;
  if (!isMember) return <section className="db-chat"><div className="db-disc-empty"><h3>Join to open the chat.</h3><p>Save this circle to message members and share the stocks you’re watching.</p><button className="db-button db-blue-button" onClick={onJoin}>Save this circle</button></div></section>;

  return <section className="db-chat" aria-label="Circle chat">
    <div className="db-chat-thread" role="log" aria-live="polite" ref={threadRef}>
      {q.isPending && <p className="db-chat-sys">{t('chat.loading', 'Loading messages…')}</p>}
      {q.isError && <p className="db-chat-sys">{t('chat.unavailable', 'Messages are unavailable right now.')}</p>}
      {q.data && messages.length === 0 && <p className="db-chat-sys">{t('chat.empty', 'No messages yet — say the first thing.')}</p>}
      {messages.map((d) => <div key={d.id} className={`db-chat-msg ${d.isMine ? 'mine' : 'theirs'}`}>
        {!d.isMine && <ProfileAvatar imageUrl={d.authorAvatarUrl} seed={d.authorAvatar ?? 0} size={34} />}
        <div className="db-chat-col">
          <span className="db-chat-author">{d.isMine ? (d.authorName || 'You') : (d.authorName || 'A member')}</span>
          <div className="db-chat-bubble">
            {d.note && <p>{d.note}</p>}
            {translations[d.id]?.shown && translations[d.id]?.text && <p className="db-chat-translation" lang={locale}>{translations[d.id].text}</p>}
            {translations[d.id]?.shown && translations[d.id]?.error && <p className="db-chat-translation-error">{t('chat.failed', 'Translation unavailable.')}</p>}
            <span className="db-chat-asset db-chat-asset-sm"><StockIcon ticker={d.subjectId} size={16} />{d.subjectLabel || d.subjectId}</span>
            <time className="db-chat-time" dateTime={d.createdAt}>{new Date(d.createdAt).toLocaleString(locale === 'zh' ? 'zh-CN' : locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
          </div>
          <div className="db-chat-actions">
            <button aria-pressed={d.savedByMe} title={d.savedByMe ? 'Saved' : 'Save'} onClick={() => (d.savedByMe ? unsave : save).mutate(d.id)}>{d.savedByMe ? <><Check size={13} /> Saved</> : <><Bookmark size={13} /> Save</>}</button>
            {locale !== 'en' && d.note && <button className="db-translate-button" aria-pressed={translations[d.id]?.shown === true} disabled={translations[d.id]?.loading} onClick={() => void translate(d)}><Languages size={13}/>{translations[d.id]?.loading ? t('chat.translating', 'Translating…') : translations[d.id]?.text && translations[d.id]?.shown ? t('chat.original', 'Show original') : t('chat.translate', 'Translate')}</button>}
            {d.isMine
              ? <button title="Remove" onClick={() => remove.mutate(d.id)}>Remove</button>
              : <><button title="Report" aria-label="Report message" onClick={() => report.mutate(d.id)}><Flag size={13} /></button><button title="Block" aria-label="Block member" onClick={() => block.mutate(d.id)}><Ban size={13} /></button></>}
          </div>
        </div>
      </div>)}
      <div ref={endRef} />
    </div>
    {share.isError && <p className="db-chat-sys" role="status">That couldn’t be sent. Please try again.</p>}
    <div className="db-chat-composer">
      <label className="sr-only" htmlFor="disc-stock">Stock to attach</label>
      <select id="disc-stock" value={ticker} onChange={(e) => setTicker(e.target.value)}>{available.map((t) => <option key={t.ticker} value={t.ticker}>{t.ticker}</option>)}</select>
      <input aria-label={t('chat.placeholder', 'Message the circle')} placeholder={t('chat.placeholder', 'Message the circle…')} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
      <button className="db-chat-send" aria-label={t('chat.send', 'Send')} disabled={share.isPending || !note.trim()} onClick={send}><Send size={17} /></button>
    </div>
    <p className="db-small-note db-chat-foot">Messages are visible to this circle’s members. Saving copies a stock to your collection; reports go to moderation; blocking hides that member from you.</p>
  </section>;
}
