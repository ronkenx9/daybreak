'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authedFetch } from '@/lib/account/api-client';
import { useAccountState } from './AccountProvider';

export interface AccountData {
  userId: string;
  profile: { displayName: string; avatar: number; handle: string | null; bio: string | null; version: number; onboardingCompleted: boolean } | null;
  bookmarks: string[];
  memberships: string[];
}

const status = (e: unknown) => (e as { status?: number } | null)?.status;

export function useAccountData() {
  const { authenticated } = useAccountState();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['account'] });

  const query = useQuery<AccountData>({
    queryKey: ['account'],
    queryFn: () => authedFetch<AccountData>('/api/me'),
    enabled: authenticated,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    retry: (n, e) => status(e) !== 503 && status(e) !== 401 && n < 2,
  });

  // Backend not provisioned yet (no DB / secret) → 503. Fall back to local.
  const serverEnabled = authenticated && status(query.error) !== 503;

  const addBookmark = useMutation({ mutationFn: (companyId: string) => authedFetch('/api/bookmarks', { method: 'POST', body: JSON.stringify({ companyId }) }), onSettled: invalidate });
  const removeBookmark = useMutation({ mutationFn: (companyId: string) => authedFetch(`/api/bookmarks?companyId=${encodeURIComponent(companyId)}`, { method: 'DELETE' }), onSettled: invalidate });
  const joinCircle = useMutation({ mutationFn: (slug: string) => authedFetch('/api/circles/membership', { method: 'POST', body: JSON.stringify({ slug }) }), onSettled: invalidate });
  const leaveCircle = useMutation({ mutationFn: (slug: string) => authedFetch(`/api/circles/membership?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' }), onSettled: invalidate });
  const updateProfile = useMutation({ mutationFn: (v: { displayName?: string; avatar?: number; version: number }) => authedFetch('/api/me', { method: 'PATCH', body: JSON.stringify(v) }), onSettled: invalidate });
  const importLocal = useMutation({ mutationFn: (v: { bookmarks: string[]; memberships: string[]; displayName?: string; avatar?: number; version: string }) => authedFetch('/api/me/import-local', { method: 'POST', body: JSON.stringify(v) }), onSettled: invalidate });

  return { data: query.data, isLoading: authenticated && query.isPending, serverEnabled, refetch: query.refetch, addBookmark, removeBookmark, joinCircle, leaveCircle, updateProfile, importLocal };
}
