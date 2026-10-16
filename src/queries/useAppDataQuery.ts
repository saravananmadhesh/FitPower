import { useQuery } from '@tanstack/react-query';
import { localRepository } from '@/data/localRepository';
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
