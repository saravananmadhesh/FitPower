import { useQuery } from '@tanstack/react-query';
import { localRepository } from '@/data/localRepository';
import type { AppData, TrainingPlan, UserProfile } from '@/types';
import { queryKeys } from './keys';

/**
 * Reads AppData through the Repository seam so every page gets consistent
 * loading/error/populated handling for free, per CLAUDE.md's UX-states
 * requirement — even though the local repo resolves synchronously today.
 */
export function useAppDataQuery() {
  return useQuery({
    queryKey: queryKeys.appData,
    queryFn: () => localRepository.getAppData(),
    staleTime: Infinity,
  });
}

/** AppData once onboarding is done: a profile and an active plan exist. */
export type ReadyAppData = AppData & { profile: UserProfile; plan: TrainingPlan };

export function isSetUp(data: AppData | undefined): data is ReadyAppData {
  return Boolean(data?.profile && data.plan);
}
