import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { localRepository } from '@/data/localRepository';
import { queryKeys } from './keys';

/**
 * Favorited exercise-catalog ids. Shares the AppData query (and its cache),
 * so favorites stay in sync with backup import / reset for free.
 */
export function useFavoritesQuery() {
  return useQuery({
    queryKey: queryKeys.appData,
    queryFn: () => localRepository.getAppData(),
    staleTime: Infinity,
    select: (data) => data.favorites,
  });
}

export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (exerciseId: string) => localRepository.toggleFavorite(exerciseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.appData }),
  });
}
