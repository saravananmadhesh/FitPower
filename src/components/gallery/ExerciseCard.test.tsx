import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import '@/i18n';
import type { CatalogExercise } from '@/domain/catalog';
import { AlbumCard } from './AlbumCard';
import { ExerciseCard } from './ExerciseCard';
import { ScorePill } from './ScorePill';
import { Dumbbell } from 'lucide-react';

const base: CatalogExercise = {
  id: 'DB_Goblet_Squat',
  name: 'Goblet Squat',
  equipment: 'dumbbell',
  album: 'legs',
  subAlbum: 'quads',
  difficulty: 'beginner',
  score: 7.5,
  scoreReason: 'B-tier: solid beginner squat pattern.',
  sources: ['consensus'],
  knee: 'friendly',
  needsBench: false,
  mechanic: 'compound',
  force: 'push',
  primaryMuscles: ['quadriceps'],
  secondaryMuscles: ['glutes'],
  instructions: ['Hold a dumbbell at your chest.', 'Squat down and stand back up.'],
  images: ['exercises/Goblet_Squat/0.webp', 'exercises/Goblet_Squat/1.webp'],
  imageSourceId: 'Goblet_Squat',
  imageNote: null,
  aliases: [],
  howToUrl: 'https://example.com/how-to',
  videoUrl: null,
  videoSearchUrl: 'https://example.com/search',
  origin: 'curated',
};

function renderCard(
  overrides: Partial<CatalogExercise> = {},
  props: { favorite?: boolean; to?: string } = {},
) {
  const onToggleFavorite = vi.fn();
  const view = render(
    <MemoryRouter>
      <ExerciseCard
        exercise={{ ...base, ...overrides }}
        favorite={props.favorite ?? false}
        onToggleFavorite={onToggleFavorite}
        to={props.to}
      />
    </MemoryRouter>,
  );
  return { ...view, onToggleFavorite };
}

describe('ExerciseCard', () => {
  it('has an accessible name with score and difficulty, and shows the core badges', () => {
    renderCard();
    const card = screen.getByRole('article', {
      name: 'Goblet Squat, score 7.5 out of 10, Beginner',
    });
    expect(within(card).getByRole('heading', { name: 'Goblet Squat' })).toBeInTheDocument();
    expect(within(card).getByText('Dumbbell')).toBeInTheDocument();
    expect(within(card).getByText('Beginner')).toBeInTheDocument();
    expect(within(card).getByText('Score 7.5 out of 10')).toBeInTheDocument();
    expect(within(card).getByAltText('Goblet Squat — start position')).toHaveAttribute(
      'loading',
      'lazy',
    );
  });

  it('shows knee and bench badges only when they apply', () => {
    const { unmount } = renderCard();
    expect(screen.queryByText(/Knee:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Bench')).not.toBeInTheDocument();
    unmount();

    renderCard({ knee: 'caution', needsBench: true });
    expect(screen.getByText('Knee: caution')).toBeInTheDocument();
    expect(screen.getByText('Bench')).toBeInTheDocument();
  });

  it('flags high-knee-stress exercises', () => {
    renderCard({ knee: 'avoid', equipment: 'band', difficulty: 'advanced' });
    expect(screen.getByText('Knee: avoid')).toBeInTheDocument();
    expect(screen.getByText('Band')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('exposes the favorite toggle state via aria-pressed and calls back on click', async () => {
    const { onToggleFavorite, unmount } = renderCard();
    const star = screen.getByRole('button', { name: 'Favorite Goblet Squat' });
    expect(star).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(star);
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
    unmount();

    renderCard({}, { favorite: true });
    expect(screen.getByRole('button', { name: 'Favorite Goblet Squat' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows a labelled placeholder when the exercise has no images', () => {
    renderCard({ images: [] });
    expect(screen.getByRole('img', { name: 'No demo image for Goblet Squat' })).toBeInTheDocument();
    expect(screen.queryByAltText('Goblet Squat — start position')).not.toBeInTheDocument();
  });

  it('keeps the end frame out of view under reduced motion (crossfade is opt-out)', () => {
    const { container } = renderCard();
    const endFrame = container.querySelector('img[alt=""]');
    expect(endFrame).toHaveClass('motion-reduce:hidden', 'opacity-0', 'group-hover:opacity-100');
  });

  it('becomes a link when given a detail route', () => {
    renderCard({}, { to: '/gallery/legs/DB_Goblet_Squat' });
    expect(
      screen.getByRole('link', { name: 'Goblet Squat, score 7.5 out of 10, Beginner' }),
    ).toHaveAttribute('href', '/gallery/legs/DB_Goblet_Squat');
  });

  it('has no axe violations (with and without images, favorited, all badges)', async () => {
    const first = renderCard({ knee: 'avoid', needsBench: true }, { favorite: true });
    expect(await axe(first.container)).toHaveNoViolations();
    first.unmount();
    const second = renderCard({ images: [] }, { to: '/gallery/legs/DB_Goblet_Squat' });
    expect(await axe(second.container)).toHaveNoViolations();
  });
});

describe('ScorePill', () => {
  it('tints by tier using tokens: accent ≥8.5, neutral 7–8.4, muted <7', () => {
    const { container, rerender } = render(<ScorePill score={9} />);
    expect(container.firstChild).toHaveClass('border-accent', 'bg-accent-soft');
    expect(screen.getByText('Score 9 out of 10')).toBeInTheDocument();

    rerender(<ScorePill score={8.4} />);
    expect(container.firstChild).toHaveClass('border-border-strong');
    expect(container.firstChild).not.toHaveClass('border-accent');

    rerender(<ScorePill score={6} />);
    expect(container.firstChild).toHaveClass('text-text-muted');
  });
});

describe('AlbumCard', () => {
  it('links to the album and reads as "name + meta"', async () => {
    const { container } = render(
      <MemoryRouter>
        <AlbumCard
          to="/gallery/arms"
          name="Arms"
          meta="60 exercises · 3 sub-albums"
          cover="exercises/One_Arm_Dumbbell_Preacher_Curl/0.webp"
          icon={Dumbbell}
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Arms 60 exercises · 3 sub-albums' });
    expect(link).toHaveAttribute('href', '/gallery/arms');
    expect(await axe(container)).toHaveNoViolations();
  });
});
