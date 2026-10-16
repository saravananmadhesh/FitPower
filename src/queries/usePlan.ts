import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localRepository } from '@/data/localRepository';
import type { TrainingPlan } from '@/types';
import { queryKeys } from './keys';

/** The active training plan, or null before onboarding. Shares the AppData query. */
export function usePlanQuery() {
  return useQuery({
    queryKey: queryKeys.appData,
    queryFn: () => localRepository.getAppData(),
    staleTime: Infinity,
    select: (data) => data.plan ?? null,
  });
}

export function useSavePlanMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: TrainingPlan) => localRepository.savePlan(plan),
    // Refetch even with no page observing AppData (e.g. on onboarding), so
    // the onboarding gate sees the new value right after navigation.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.appData, refetchType: 'all' }),
  });
}
