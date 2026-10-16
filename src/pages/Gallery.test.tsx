import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import '@/i18n';
import { CommandPalette } from '@/components/app/CommandPalette';
import { localRepository } from '@/data/localRepository';
import { ROUTES } from '@/routes';
import { useUiStore } from '@/store/useUiStore';
import Gallery from './Gallery';
import GalleryAlbum from './GalleryAlbum';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={ROUTES.gallery} element={<Gallery />} />
          <Route path={ROUTES.galleryAlbum} element={<GalleryAlbum />} />
        </Routes>
        <CommandPalette />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const exerciseCards = async () =>
  within(await screen.findByRole('list', { name: 'Exercises' })).getAllByRole('article');
const cardNames = async () =>
  (await exerciseCards()).map((card) => within(card).getByRole('heading').textContent);

beforeEach(async () => {
  await localRepository.reset();
  useUiStore.getState().setPaletteOpen(false);
});

describe('Gallery home', () => {
  it('lists Favorites first, then the 7 albums with counts', async () => {
    renderAt('/gallery');
    const links = within(await screen.findByRole('list', { name: 'Albums' })).getAllByRole('link');
    expect(links.map((link) => within(link).getByRole('heading').textContent)).toEqual([
      'Favorites',
      'Arms',
      'Shoulders',
      'Chest',
      'Back',
      'Core',
      'Legs',
      'Full body',
    ]);
    expect(links[0]).toHaveAttribute('href', '/gallery/favorites');
    expect(links[0]).toHaveTextContent('Tap ☆ on any exercise to save it here');
    expect(links[1]).toHaveAttribute('href', '/gallery/arms');
    expect(links[1]).toHaveTextContent('60 exercises · 3 sub-albums');
  });

  it('shows the favorite count once something is starred', async () => {
    await localRepository.toggleFavorite('Hammer_Curls');
    renderAt('/gallery');
    expect(await screen.findByRole('link', { name: /Favorites/ })).toHaveTextContent('1 exercise');
  });

  it('opens the "How we rate" sheet with the scale and source links', async () => {
    renderAt('/gallery');
    await userEvent.click(await screen.findByRole('button', { name: 'How we rate' }));
    const sheet = screen.getByRole('dialog', { name: 'How we rate exercises' });
    expect(within(sheet).getByText('S-tier ≈ 9')).toBeInTheDocument();
    const sources = within(sheet).getAllByRole('link');
    expect(sources).toHaveLength(11);
    for (const link of sources) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderAt('/gallery');
    await screen.findByRole('list', { name: 'Albums' });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Album view', () => {
  it('shows every exercise in the album, best score first, with a breadcrumb', async () => {
    renderAt('/gallery/arms');
    expect(await exerciseCards()).toHaveLength(60);
    expect((await cardNames())[0]).toBe('One Arm Dumbbell Preacher Curl');
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'Gallery' })).toHaveAttribute(
      'href',
      '/gallery',
    );
    expect(within(breadcrumb).getByText('Arms')).toHaveAttribute('aria-current', 'page');
  });

  it('reads the sub-album from ?sub= and keeps the URL in sync when a tab is picked', async () => {
    renderAt('/gallery/arms?sub=biceps');
    expect(await exerciseCards()).toHaveLength(26);
    expect(screen.getByRole('tab', { name: 'Biceps' })).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(screen.getByRole('tab', { name: 'Triceps' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/gallery/arms?sub=triceps');
    expect(screen.getByRole('tabpanel', { name: 'Triceps' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'All' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/\/gallery\/arms$/);
    expect(await exerciseCards()).toHaveLength(60);
  });

  it('tabs are keyboard-operable (arrow keys move and select)', async () => {
    renderAt('/gallery/arms');
    const all = await screen.findByRole('tab', { name: 'All' });
    all.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Biceps' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Biceps' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Forearms & grip' })).toHaveFocus();
  });

  it('falls back to All for an unknown ?sub=', async () => {
    renderAt('/gallery/arms?sub=quads');
    expect(await exerciseCards()).toHaveLength(60);
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
  });

  it('sorts by A–Z and difficulty, synced to ?sort=', async () => {
    renderAt('/gallery/back');
    await exerciseCards();
    const sort = screen.getByRole('combobox', { name: 'Sort by' });
    expect(sort).toHaveValue('score');

    await userEvent.selectOptions(sort, 'name');
    const names = await cardNames();
    expect(names).toEqual([...names].sort((a, b) => (a ?? '').localeCompare(b ?? '')));
    expect(screen.getByTestId('location')).toHaveTextContent('/gallery/back?sort=name');

    await userEvent.selectOptions(sort, 'difficulty');
    expect(screen.getByTestId('location')).toHaveTextContent('?sort=difficulty');
    const [first] = await exerciseCards();
    expect(within(first).getByText('Beginner')).toBeInTheDocument();
  });

  it('favoriting a card persists it and shows it in the Favorites album', async () => {
    const view = renderAt('/gallery/arms?sub=biceps');
    await exerciseCards();
    const star = screen.getByRole('button', { name: 'Favorite Dumbbell Bicep Curl' });
    expect(star).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(star);
    expect(
      await screen.findByRole('button', { name: 'Favorite Dumbbell Bicep Curl', pressed: true }),
    ).toBeInTheDocument();
    expect((await localRepository.getAppData()).favorites).toHaveLength(1);
    view.unmount();

    renderAt('/gallery/favorites');
    expect(await cardNames()).toEqual(['Dumbbell Bicep Curl']);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

    // Un-starring inside Favorites removes it and reveals the empty state.
    await userEvent.click(screen.getByRole('button', { name: 'Favorite Dumbbell Bicep Curl' }));
    expect(await screen.findByText('No favorites yet')).toBeInTheDocument();
  });

  it('shows the Favorites empty state with a way back', async () => {
    renderAt('/gallery/favorites');
    expect(await screen.findByText('No favorites yet')).toBeInTheDocument();
    expect(screen.getByText('Tap ☆ on any exercise to save it here.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse albums' })).toHaveAttribute('href', '/gallery');
  });

  it('shows a not-found state for an unknown album', async () => {
    renderAt('/gallery/wings');
    expect(await screen.findByText('Album not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to gallery' })).toHaveAttribute(
      'href',
      '/gallery',
    );
  });

  it('has no axe violations', async () => {
    const { container } = renderAt('/gallery/core?sub=abs');
    await exerciseCards();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Exercise detail (deep-linked dialog)', () => {
  it('opens from a card, keeps ?sub= in the URL, and closes back to the album', async () => {
    renderAt('/gallery/arms?sub=biceps');
    await exerciseCards();
    await userEvent.click(
      screen.getByRole('link', { name: 'Dumbbell Bicep Curl, score 8 out of 10, Beginner' }),
    );

    const dialog = await screen.findByRole('dialog', { name: 'Dumbbell Bicep Curl' });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/gallery/arms/Dumbbell_Bicep_Curl?sub=biceps',
    );
    expect(within(dialog).getByRole('link', { name: 'Watch on YouTube' })).toBeInTheDocument();
    expect(within(dialog).getByText(/Not logged yet/)).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/\/gallery\/arms\?sub=biceps$/);
    // Focus returns to the card the dialog was opened from.
    expect(
      screen.getByRole('link', { name: 'Dumbbell Bicep Curl, score 8 out of 10, Beginner' }),
    ).toHaveFocus();
  });

  it('opens straight from a deep link and shows logged history via aliases', async () => {
    await localRepository.saveSet('2026-01-07', 'DB biceps curl', { w: 8, reps: 12 });
    await localRepository.saveSet('2026-01-14', 'DB biceps curl', { w: 6, reps: 15 });
    renderAt('/gallery/arms/Dumbbell_Bicep_Curl');

    const dialog = await screen.findByRole('dialog', { name: 'Dumbbell Bicep Curl' });
    expect(within(dialog).getByText('Last set').nextElementSibling).toHaveTextContent(
      'Jan 14, 2026 · 6 kg × 15',
    );
    expect(within(dialog).getByText('Best set').nextElementSibling).toHaveTextContent(
      'Jan 7, 2026 · 8 kg × 12',
    );
    expect(within(dialog).getByText('Sessions logged').nextElementSibling).toHaveTextContent('2');
  });

  it('favoriting inside the dialog persists and shows in the Favorites album', async () => {
    renderAt('/gallery/arms/Dumbbell_Bicep_Curl');
    const dialog = await screen.findByRole('dialog', { name: 'Dumbbell Bicep Curl' });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Favorite Dumbbell Bicep Curl' }),
    );
    expect(
      await within(dialog).findByRole('button', {
        name: 'Favorite Dumbbell Bicep Curl',
        pressed: true,
      }),
    ).toBeInTheDocument();
    expect((await localRepository.getAppData()).favorites).toEqual(['Dumbbell_Bicep_Curl']);
  });

  it('opens over the Favorites album too, and ignores an unknown exercise id', async () => {
    await localRepository.toggleFavorite('Dumbbell_Bicep_Curl');
    const view = renderAt('/gallery/favorites/Dumbbell_Bicep_Curl');
    expect(await screen.findByRole('dialog', { name: 'Dumbbell Bicep Curl' })).toBeInTheDocument();
    view.unmount();

    renderAt('/gallery/arms/Not_A_Real_Exercise');
    expect(await exerciseCards()).toHaveLength(60);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('⌘K palette gallery entries', () => {
  it('offers Open gallery, Favorites and one entry per album, and navigates', async () => {
    renderAt('/gallery');
    await screen.findByRole('list', { name: 'Albums' });
    await userEvent.keyboard('{Control>}k{/Control}');

    const palette = await screen.findByRole('dialog', { name: 'Command palette' });
    expect(within(palette).getByRole('button', { name: 'Open gallery' })).toBeInTheDocument();
    expect(within(palette).getByRole('button', { name: 'Favorites' })).toBeInTheDocument();
    expect(within(palette).getAllByRole('button', { name: /^Open album: / })).toHaveLength(7);

    // Filtering leaves only matching rows (no stale ones from the unfiltered list).
    await userEvent.type(within(palette).getByRole('textbox'), 'album');
    expect(within(palette).getAllByRole('option')).toHaveLength(7);
    await userEvent.type(within(palette).getByRole('textbox'), ': leg');
    expect(within(palette).getAllByRole('option')).toHaveLength(1);
    await userEvent.click(within(palette).getByRole('button', { name: 'Open album: Legs' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/gallery/legs');
    expect(await exerciseCards()).toHaveLength(39);
  });
});
