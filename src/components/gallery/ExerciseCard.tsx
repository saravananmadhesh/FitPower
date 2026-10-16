import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Dumbbell } from 'lucide-react';
import type { CatalogExercise } from '@/domain/catalog';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { exerciseImageUrl, formatScore } from '@/utils/gallery';
import { DifficultyBadge } from './DifficultyBadge';
import { FavoriteButton } from './FavoriteButton';
import { ScorePill } from './ScorePill';

interface ExerciseCardProps {
  exercise: CatalogExercise;
  favorite: boolean;
  onToggleFavorite: () => void;
  /** Detail route. When set, the whole card becomes a link to it. */
  to?: string;
}

export function ExerciseCard({ exercise, favorite, onToggleFavorite, to }: ExerciseCardProps) {
  const { t, i18n } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const [start, end] = exercise.images;
  const hasImages = Boolean(start) && !imageFailed;
  const label = t('gallery.card.label', {
    name: exercise.name,
    score: formatScore(exercise.score, i18n.language),
    difficulty: t(`gallery.difficulty.${exercise.difficulty}`),
  });

  return (
    <article
      aria-label={label}
      data-exercise-id={exercise.id}
      className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-e1 transition-colors duration-base focus-within:border-border-strong hover:border-border-strong"
    >
      {/* Fixed 3:2 frame; images are taken out of flow so portrait demos letterbox instead of stretching the card. */}
      <div className="relative aspect-[3/2] bg-card-2">
        {hasImages ? (
          <>
            <img
              src={exerciseImageUrl(start)}
              alt={t('gallery.card.imageAlt', { name: exercise.name })}
              width={480}
              height={320}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="absolute inset-0 h-full w-full object-contain"
            />
            {/* End frame: decorative crossfade on hover/focus; never shown under reduced motion. */}
            {end && (
              <img
                src={exerciseImageUrl(end)}
                alt=""
                width={480}
                height={320}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full bg-card-2 object-contain opacity-0 transition-opacity duration-slow group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:hidden"
              />
            )}
          </>
        ) : (
          <div
            role="img"
            aria-label={t('gallery.card.noImage', { name: exercise.name })}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Dumbbell className="h-10 w-10 text-text-subtle" aria-hidden="true" />
          </div>
        )}
        <FavoriteButton
          name={exercise.name}
          pressed={favorite}
          onToggle={onToggleFavorite}
          className="absolute right-2 top-2 z-10"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-h3 text-text">
            {to ? (
              <Link
                to={to}
                aria-label={label}
                className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
              >
                {exercise.name}
              </Link>
            ) : (
              exercise.name
            )}
          </h3>
          <ScorePill score={exercise.score} />
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5">
          <Badge>{t(`gallery.equipment.${exercise.equipment}`)}</Badge>
          <DifficultyBadge difficulty={exercise.difficulty} />
          {exercise.knee !== 'friendly' && (
            <Badge
              className={cn(
                'gap-1 text-text',
                exercise.knee === 'avoid' ? 'bg-danger-soft' : 'bg-warning-soft',
              )}
            >
              <AlertTriangle
                className={cn(
                  'h-3 w-3',
                  exercise.knee === 'avoid' ? 'text-danger' : 'text-warning',
                )}
                aria-hidden="true"
              />
              {t(`gallery.knee.${exercise.knee}`)}
            </Badge>
          )}
          {exercise.needsBench && <Badge>{t('gallery.bench')}</Badge>}
        </div>
      </div>
    </article>
  );
}
