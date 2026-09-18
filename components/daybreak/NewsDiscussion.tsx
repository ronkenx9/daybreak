'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send } from 'lucide-react';
import { authedFetch } from '@/lib/account/api-client';
import { useAccountState } from './AccountProvider';
import { ProfileAvatar } from './Identity';

interface Comment { id: string; body: string; createdAt: string; authorName: string | null; authorAvatar: number | null; authorAvatarUrl: string | null }

export default function NewsDiscussion({ ticker, url, circleSlug, isMember = true }: { ticker: string; url: string; circleSlug?: string; isMember?: boolean }) {
  const account = useAccountState(); const qc = useQueryClient(); const [body, setBody] = useState('');
  const key = ['news-comments', circleSlug ?? 'stock', ticker, url];
  const q = useQuery({ queryKey: key, queryFn: async ({ signal }) => {
    const params = new URLSearchParams({ ticker, url }); if (circleSlug) params.set('circleSlug', circleSlug);
    const response = await fetch(`/api/news/comments?${params}`, { signal });
    const data = await response.json(); if (!response.ok) throw Error(data.error || 'Discussion unavailable'); return data as { comments: Comment[] };
  }, retry: false });
  const post = useMutation({ mutationFn: () => authedFetch('/api/news/comments', { method: 'POST', body: JSON.stringify({ ticker, url, body, ...(circleSlug ? { circleSlug } : {}) }) }), onSuccess: () => { setBody(''); void qc.invalidateQueries({ queryKey: key }); } });

  return <section className="db-news-discussion" aria-label="Article discussion">
    <div className="db-news-discussion-head"><span><MessageCircle size={17}/> Discussion</span><small>{q.data?.comments.length ?? 0} comments</small></div>
    {account.authenticated && (!circleSlug || isMember) ? <div className="db-news-composer"><textarea aria-label="Add to the discussion" placeholder="What stood out to you?" maxLength={500} value={body} onChange={(event) => setBody(event.target.value)}/><button className="db-button db-blue-button" disabled={body.trim().length < 2 || post.isPending} onClick={() => post.mutate()}><Send size={15}/>{post.isPending ? 'Posting…' : 'Post'}</button></div> : <div className="db-news-signin"><strong>{account.authenticated ? 'Join this circle to comment.' : 'Join the conversation.'}</strong><span>{account.authenticated ? 'Reading stays open after your holding is verified.' : 'Sign in from the top bar to comment. Reading stays open to everyone.'}</span></div>}
    {post.isError && <p className="db-news-error" role="status">Your comment could not be posted.</p>}
    {q.isPending && <p className="db-small-note" role="status">Loading discussion…</p>}
    {q.isError && <p className="db-small-note" role="status">Discussion is temporarily unavailable.</p>}
    {q.data?.comments.length === 0 && <div className="db-news-no-comments"><MessageCircle size={22}/><p>Start the discussion around this story and the market movement beside it.</p></div>}
    <div className="db-news-comments">{q.data?.comments.map((comment) => <article key={comment.id}><ProfileAvatar imageUrl={comment.authorAvatarUrl} seed={comment.authorAvatar ?? 0} size={38}/><div><p><strong>{comment.authorName || 'A member'}</strong><time>{new Date(comment.createdAt).toLocaleDateString()}</time></p><span>{comment.body}</span></div></article>)}</div>
  </section>;
}
