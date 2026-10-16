import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import '@/i18n';
import type { CatalogExercise, ExerciseHistory } from '@/domain/catalog';
import { ExerciseDetail } from './ExerciseDetail';

const sources = {
  consensus: { title: 'Coaching consensus', url: 'https://example.com/consensus' },
  'ace-abs': { title: 'ACE abs study', url: 'https://example.com/ace' },
};

const base: CatalogExercise = {
  id: 'DB_Goblet_Squat',
  name: 'Goblet Squat',
  equipment: 'dumbbell',
  album: 'legs',
  subAlbum: 'quads',
  difficulty: 'beginner',
  score: 7.5,
  scoreReason: 'B-tier: solid beginner squat pattern.',
  sources: ['consensus', 'ace-abs'],
  knee: 'friendly',
  needsBench: false,
  mechanic: 'compound',
  force: 'push',
  primaryMuscles: ['quadriceps'],
  secondaryMuscles: ['glutes', 'hamstrings'],
  instructions: ['Hold a dumbbell at your chest.', 'Squat down and stand back up.'],
  images: ['exercises/Goblet_Squat/0.webp', 'exercises/Goblet_Squat/1.webp'],
  imageSourceId: 'Goblet_Squat',
  imageNote: null,
  aliases: [],
  howToUrl: 'https://example.com/how-to',
  videoUrl: 'https://www.youtube.com/watch?v=abc',
  videoSearchUrl: 'https://www.youtube.com/results?search_query=goblet',
  origin: 'curated',
};

const noHistory: ExerciseHistory = { last: null, best: null, sessions: 0 };

function renderDetail(
  overrides: Partial<CatalogExercise> = {},
  props: { history?: ExerciseHistory; favorite?: boolean } = {},
) {
  const onClose = vi.fn();
  const onToggleFavorite = vi.fn();
  const view = render(
    <ExerciseDetail
      exercise={{ ...base, ...overrides }}
      sources={sources}
      history={props.history ?? noHistory}
      favorite={props.favorite ?? false}
      onToggleFavorite={onToggleFavorite}
      onClose={onClose}
    />,
  );
  return { ...view, onClose, onToggleFavorite, dialog: screen.getByRole('dialog') };
}

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('ExerciseDetail', () => {
  it('is a dialog named after the exercise, with score, reason and source links', () => {
    const { dialog } = renderDetail();
    expect(dialog).toHaveAccessibleName('Goblet Squat');
    expect(within(dialog).getByText('Score 7.5 out of 10')).toBeInTheDocument();
    expect(within(dialog).getByText('B-tier: solid beginner squat pattern.')).toBeInTheDocument();
    const source = within(dialog).getByRole('link', { name: 'Coaching consensus' });
    expect(source).toHaveAttribute('href', 'https://example.com/consensus');
    expect(source).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(dialog).getByRole('link', { name: 'ACE abs study' })).toBeInTheDocument();
  });

  it('shows the start and end images with descriptive alt text', () => {
    renderDetail();
    expect(screen.getByAltText('Goblet Squat — start position')).toHaveAttribute(
      'src',
      '/exercises/Goblet_Squat/0.webp',
    );
    expect(screen.getByAltText('Goblet Squat — end position')).toHaveAttribute(
      'src',
      '/exercises/Goblet_Squat/1.webp',
    );
  });

  it('play toggle alternates the frames every 1.2 s, and pause restores the pair', () => {
    vi.useFakeTimers();
    renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Play demo' }));

    const demo = screen.getByAltText('Goblet Squat — demo');
    expect(demo).toHaveAttribute('src', '/exercises/Goblet_Squat/0.webp');
    act(() => void vi.advanceTimersByTime(1200));
    expect(demo).toHaveAttribute('src', '/exercises/Goblet_Squat/1.webp');
    act(() => void vi.advanceTimersByTime(1200));
    expect(demo).toHaveAttribute('src', '/exercises/Goblet_Squat/0.webp');

    const pause = screen.getByRole('button', { name: 'Pause demo' });
    expect(pause).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(pause);
    expect(screen.getByAltText('Goblet Squat — end position')).toBeInTheDocument();
  });

  it('offers no play toggle under prefers-reduced-motion', () => {
    stubReducedMotion(true);
    renderDetail();
    expect(screen.queryByRole('button', { name: 'Play demo' })).not.toBeInTheDocument();
    expect(screen.getByAltText('Goblet Squat — start position')).toBeInTheDocument();
  });

  it('shows a placeholder (and no play toggle) when there are no images', () => {
    renderDetail({ images: [] });
    expect(screen.getByText('No demo image for this exercise yet.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play demo' })).not.toBeInTheDocument();
  });

  it('shows the image note when the demo is a substitute', () => {
    renderDetail({ imageNote: 'Demo image shows the cable-machine version.' });
    expect(screen.getByText('Demo image shows the cable-machine version.')).toBeInTheDocument();
  });

  it('links to the curated video, or labels the fallback as a search', () => {
    const first = renderDetail();
    expect(screen.getByRole('link', { name: 'Watch on YouTube' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=abc',
    );
    const guide = screen.getByRole('link', { name: 'How-to guide' });
    expect(guide).toHaveAttribute('href', 'https://example.com/how-to');
    expect(guide).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Links open in a new tab and need internet.')).toBeInTheDocument();
    first.unmount();

    renderDetail({ videoUrl: null });
    expect(screen.queryByRole('link', { name: 'Watch on YouTube' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Search YouTube' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/results?search_query=goblet',
    );
  });

  it('shows the knee note only for caution / avoid', () => {
    const friendly = renderDetail();
    expect(screen.queryByText(/^Knee:/)).not.toBeInTheDocument();
    friendly.unmount();

    const caution = renderDetail({ knee: 'caution' });
    expect(screen.getByText('Knee: caution — keep the range pain-free.')).toBeInTheDocument();
    caution.unmount();

    renderDetail({ knee: 'avoid' });
    expect(screen.getByText('Knee: high knee stress — skip during knee pain.')).toBeInTheDocument();
  });

  it('lists the facts and numbered how-to steps', () => {
    const { dialog } = renderDetail({ needsBench: true, secondaryMuscles: [] });
    const fact = (label: string) => within(dialog).getByText(label).nextElementSibling;
    expect(fact('Equipment')).toHaveTextContent('Dumbbell');
    expect(fact('Difficulty')).toHaveTextContent('Beginner');
    expect(fact('Type')).toHaveTextContent('Compound');
    expect(fact('Bench needed')).toHaveTextContent('Yes');
    expect(fact('Primary muscles')).toHaveTextContent('quadriceps');
    expect(fact('Secondary muscles')).toHaveTextContent('—');
    const steps = within(within(dialog).getByRole('list')).getAllByRole('listitem');
    expect(steps.map((s) => s.textContent)).toEqual(base.instructions);
  });

  it('shows the history empty state, then last / best / sessions once logged', () => {
    const empty = renderDetail();
    expect(
      screen.getByText("Not logged yet — it'll appear here after you log a set in Workout."),
    ).toBeInTheDocument();
    empty.unmount();

    const { dialog } = renderDetail(
      {},
      {
        history: {
          last: { date: '2026-01-21', w: 10, reps: 12 },
          best: { date: '2026-01-07', w: 12, reps: 8 },
          sessions: 3,
        },
      },
    );
    const fact = (label: string) => within(dialog).getByText(label).nextElementSibling;
    expect(fact('Last set')).toHaveTextContent('Jan 21, 2026 · 10 kg × 12');
    expect(fact('Best set')).toHaveTextContent('Jan 7, 2026 · 12 kg × 8');
    expect(fact('Sessions logged')).toHaveTextContent('3');
  });

  it('toggles favorite and closes via the button or Esc', async () => {
    const { onToggleFavorite, onClose } = renderDetail({}, { favorite: true });
    const star = screen.getByRole('button', { name: 'Favorite Goblet Squat' });
    expect(star).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(star);
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('keeps focus inside the dialog', async () => {
    const { dialog } = renderDetail();
    for (let i = 0; i < 12; i++) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('has no axe violations (with images + history, and without either)', async () => {
    const first = renderDetail(
      { knee: 'avoid', imageNote: 'Substitute demo.' },
      {
        history: {
          last: { date: '2026-01-21', w: 10, reps: 12 },
          best: { date: '2026-01-21', w: 10, reps: 12 },
          sessions: 1,
        },
      },
    );
    expect(await axe(first.dialog)).toHaveNoViolations();
    first.unmount();

    const second = renderDetail({ images: [], videoUrl: null });
    expect(await axe(second.dialog)).toHaveNoViolations();
  });
});
