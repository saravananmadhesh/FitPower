import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { localRepository } from '@/data/localRepository';
import { useFavoritesQuery, useToggleFavoriteMutation } from './useFavorites';

function renderFavorites() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(
    () => ({ favorites: useFavoritesQuery(), toggle: useToggleFavoriteMutation() }),
    { wrapper },
  );
}

beforeEach(async () => {
  await localRepository.reset();
});

describe('useFavoritesQuery / useToggleFavoriteMutation', () => {
  it('reads favorites through the repository', async () => {
    await localRepository.toggleFavorite('Hammer_Curls');
    const { result } = renderFavorites();
    await waitFor(() => expect(result.current.favorites.data).toEqual(['Hammer_Curls']));
  });

  it('toggling updates the query result (on, then off)', async () => {
    const { result } = renderFavorites();
    await waitFor(() => expect(result.current.favorites.data).toEqual([]));

    await act(() => result.current.toggle.mutateAsync('DB_Goblet_Squat'));
    await waitFor(() => expect(result.current.favorites.data).toEqual(['DB_Goblet_Squat']));

    await act(() => result.current.toggle.mutateAsync('DB_Goblet_Squat'));
    await waitFor(() => expect(result.current.favorites.data).toEqual([]));
  });
});
