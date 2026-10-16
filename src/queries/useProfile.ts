import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localRepository } from '@/data/localRepository';
import type { UserProfile } from '@/types';
import { queryKeys } from './keys';

/**
 * The user's profile, or null before onboarding. Shares the AppData query
 * (and its cache) so it stays in sync with backup import / reset.
 */
export function useProfileQuery() {
  return useQuery({
    queryKey: queryKeys.appData,
    queryFn: () => localRepository.getAppData(),
    staleTime: Infinity,
    select: (data) => data.profile ?? null,
  });
}

export function useSaveProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: UserProfile) => localRepository.saveProfile(profile),
    // Refetch even with no page observing AppData (e.g. on onboarding), so
    // the onboarding gate sees the new value right after navigation.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.appData, refetchType: 'all' }),
  });
}
