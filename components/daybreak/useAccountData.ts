'use client';
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authedFetch } from '@/lib/account/api-client';
import { accountQueryKey } from '@/lib/account/cache';
import { useAccountState } from './AccountProvider';

export interface ProfileData {
  displayName: string; avatar: number; handle: string | null; bio: string | null; version: number; onboardingCompleted?: boolean;
}

export interface AccountData {
  userId: string;
  profile: ProfileData | null;
  bookmarks: string[];
  memberships: string[];
}

const status = (e: unknown) => (e as { status?: number } | null)?.status;

export function useAccountData() {
  const { authenticated, user } = useAccountState();
  const identity = authenticated ? user?.id ?? null : null;
  const qc = useQueryClient();
  const previousIdentity = useRef<string | null>(null);
  const queryKey = accountQueryKey(identity);
  const invalidate = () => qc.invalidateQueries({ queryKey });

  useEffect(() => {
    const previous = previousIdentity.current;
    if (previous && previous !== identity) {
      void qc.cancelQueries({ queryKey: accountQueryKey(previous) });
      qc.removeQueries({ queryKey: accountQueryKey(previous) });
    }
    previousIdentity.current = identity;
  }, [identity, qc]);

  const query = useQuery<AccountData>({
    queryKey,
    queryFn: () => authedFetch<AccountData>('/api/me'),
    enabled: authenticated && Boolean(identity),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    retry: (n, e) => status(e) !== 503 && status(e) !== 401 && n < 2,
  });

  // Backend unavailable (503 no DB/secret) or the session was rejected (401) →
  // fall back to local; we do not treat the server as the source of truth.
  const serverEnabled = authenticated && status(query.error) !== 503 && status(query.error) !== 401;

  const addBookmark = useMutation({ mutationFn: (companyId: string) => authedFetch('/api/bookmarks', { method: 'POST', body: JSON.stringify({ companyId }) }), onSettled: invalidate });
  const removeBookmark = useMutation({ mutationFn: (companyId: string) => authedFetch(`/api/bookmarks?companyId=${encodeURIComponent(companyId)}`, { method: 'DELETE' }), onSettled: invalidate });
  const joinCircle = useMutation({ mutationFn: (slug: string) => authedFetch('/api/circles/membership', { method: 'POST', body: JSON.stringify({ slug }) }), onSettled: invalidate });
  const leaveCircle = useMutation({ mutationFn: (slug: string) => authedFetch(`/api/circles/membership?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' }), onSettled: invalidate });
  const updateProfile = useMutation({ mutationFn: (v: { displayName?: string; avatar?: number; version: number }) => authedFetch<{ profile: ProfileData }>('/api/me', { method: 'PATCH', body: JSON.stringify(v) }), onSettled: invalidate });
  const importLocal = useMutation({ mutationFn: (v: { bookmarks: string[]; memberships: string[]; displayName?: string; avatar?: number }) => authedFetch('/api/me/import-local', { method: 'POST', body: JSON.stringify(v) }), onSettled: invalidate });

  // Truthful sync state for the UI — only "synced" once the server actually
  // returned this account's data, never merely because a token exists.
  const anyMutating = [addBookmark, removeBookmark, joinCircle, leaveCircle, updateProfile, importLocal].some((m) => m.isPending);
  const errStatus = status(query.error);
  const syncStatus: 'off' | 'loading' | 'saving' | 'synced' | 'offline' | 'expired' | 'error' =
    !authenticated ? 'off'
    : errStatus === 503 ? 'offline'
    : errStatus === 401 ? 'expired'
    : query.isError ? 'error'
    : anyMutating ? 'saving'
    : query.data ? 'synced'
    : 'loading';

  return { data: query.data, isLoading: authenticated && query.isPending, serverEnabled, syncStatus, anyMutating, refetch: query.refetch, addBookmark, removeBookmark, joinCircle, leaveCircle, updateProfile, importLocal };
}
