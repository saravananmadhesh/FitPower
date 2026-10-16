import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/i18n';
import { localRepository } from '@/data/localRepository';
import { legacyPlan, legacyProfile } from '@/domain/plans/legacy';
import { todayISO } from '@/domain/dates';
import { ExerciseRow } from '@/components/workout/ExerciseRow';
import Workout from './Workout';

function renderWorkout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Workout />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const rowFor = (name: string): HTMLElement => screen.getByText(name).closest('li') as HTMLElement;

beforeEach(async () => {
  await localRepository.reset();
  await localRepository.saveProfile(legacyProfile(todayISO(), todayISO()));
  await localRepository.savePlan(legacyPlan(todayISO()));
});

describe('Workout page ↔ gallery catalog', () => {
  it('uses the curated video and links each matched exercise to its gallery detail', async () => {
    renderWorkout();
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Session' }), 'A');

    const row = rowFor('DB goblet squat (box, partial)');
    const gallery = await within(row).findByRole('link', {
      name: 'View DB goblet squat (box, partial) in the gallery',
    });
    expect(gallery.getAttribute('href')).toMatch(/^\/gallery\/legs\/[\w-]+$/);
    expect(within(row).getByRole('link', { name: /video/ }).getAttribute('href')).toMatch(
      /^https:\/\/www\.youtube\.com\/watch\?v=/,
    );
    // The how-to link is unchanged.
    expect(
      within(row)
        .getByRole('link', { name: /how to/ })
        .getAttribute('href'),
    ).toMatch(/^https:\/\/www\.google\.com\/search/);

    // Every exercise in the session resolves, so every row gets a gallery link.
    expect(screen.getAllByRole('link', { name: /in the gallery$/ })).toHaveLength(7);
  });

  it('follows a swap: the links point at the substituted exercise', async () => {
    renderWorkout();
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Session' }), 'A');
    const before = within(rowFor('DB floor press'))
      .getByRole('link', { name: /in the gallery$/ })
      .getAttribute('href');

    await userEvent.click(within(rowFor('DB floor press')).getByRole('button', { name: /swap/ }));
    const after = within(rowFor('Band chest press'))
      .getByRole('link', { name: 'View Band chest press in the gallery' })
      .getAttribute('href');
    expect(after).toMatch(/^\/gallery\/chest\//);
    expect(after).not.toBe(before);
  });
});

describe('ExerciseRow', () => {
  it('keeps the search links and shows no gallery link when there is no catalog match', () => {
    render(
      <MemoryRouter>
        <ul>
          <ExerciseRow
            displayName="Mystery move"
            reps="10 reps"
            hasAlternatives={false}
            onSwap={() => {}}
            lastSet={null}
            onSaveSet={() => {}}
            howToHref="https://example.com/how"
            videoHref="https://example.com/search"
          />
        </ul>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /video/ })).toHaveAttribute(
      'href',
      'https://example.com/search',
    );
    expect(screen.queryByRole('link', { name: /gallery/ })).not.toBeInTheDocument();
  });
});

describe('Workout safety card', () => {
  it('shows knee care only when the profile has a knee injury', async () => {
    renderWorkout();
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Session' }), 'A');
    expect(screen.getByText('Knee care')).toBeInTheDocument();
  });

  it('shows general form tips, not the legacy knee notes, without a knee injury', async () => {
    await localRepository.saveProfile({ ...legacyProfile(todayISO(), todayISO()), injuries: [] });
    renderWorkout();
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Session' }), 'A');
    expect(screen.getByText('Form first')).toBeInTheDocument();
    expect(screen.queryByText(/knee/i)).not.toBeInTheDocument();
  });
});
